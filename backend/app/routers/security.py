"""
Security API endpoints - Sessions and 2FA management.

Implements:
- GET /api/auth/sessions - List active sessions
- DELETE /api/auth/sessions/{session_id} - Revoke a session
- POST /api/auth/2fa/setup - Setup 2FA
- POST /api/auth/2fa/enable - Enable 2FA with verified code
- POST /api/auth/2fa/disable - Disable 2FA
- POST /api/auth/2fa/verify - Verify 2FA code
"""

import logging
import secrets
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..models.user import User
from ..models.user_session import UserSession
from ..models.two_factor_auth import TwoFactorAuth
from ..models.base import get_db_session
from ..schemas.auth import UserInfoResponse
from ..services.auth import decode_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["security"])


async def get_current_user_dependency(
    request: Request,
) -> User:
    """Dependency to get current authenticated user."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    async with get_db_session() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        
        return user


class SessionResponse(BaseModel):
    id: str
    device_type: Optional[str]
    browser: Optional[str]
    operating_system: Optional[str]
    ip_address: Optional[str]
    location: Optional[str]
    last_active_at: Optional[str]
    created_at: Optional[str]
    is_current: bool


class SessionsListResponse(BaseModel):
    sessions: list[SessionResponse]
    total: int


class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_code: str
    message: str


class TwoFactorEnableRequest(BaseModel):
    code: str = Field(..., description="TOTP code from authenticator app")


class TwoFactorVerifyRequest(BaseModel):
    code: str = Field(..., description="TOTP code or backup code")


class BackupCodesResponse(BaseModel):
    backup_codes: list[str]
    message: str


class TwoFactorStatusResponse(BaseModel):
    is_enabled: bool
    backup_codes_count: int
    enabled_at: Optional[str]


def parse_user_agent(user_agent: str) -> dict:
    """Parse user agent string to extract device info."""
    info = {
        "device_type": "Unknown",
        "browser": "Unknown",
        "operating_system": "Unknown",
    }
    
    user_agent = user_agent.lower()
    
    if "mobile" in user_agent or "android" in user_agent:
        info["device_type"] = "Mobile"
    elif "tablet" in user_agent or "ipad" in user_agent:
        info["device_type"] = "Tablet"
    else:
        info["device_type"] = "Desktop"
    
    if "chrome" in user_agent:
        info["browser"] = "Chrome"
    elif "firefox" in user_agent:
        info["browser"] = "Firefox"
    elif "safari" in user_agent:
        info["browser"] = "Safari"
    elif "edge" in user_agent:
        info["browser"] = "Edge"
    
    if "windows" in user_agent:
        info["operating_system"] = "Windows"
    elif "mac" in user_agent:
        info["operating_system"] = "macOS"
    elif "linux" in user_agent:
        info["operating_system"] = "Linux"
    elif "android" in user_agent:
        info["operating_system"] = "Android"
    elif "ios" in user_agent or "iphone" in user_agent:
        info["operating_system"] = "iOS"
    
    return info


@router.get("/sessions", response_model=SessionsListResponse)
async def list_sessions(
    current_user: User = Depends(get_current_user_dependency),
):
    """List all active sessions for the current user."""
    async with get_db_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(
            select(UserSession)
            .where(UserSession.user_id == current_user.id)
            .where(UserSession.is_revoked == False)
            .where(UserSession.expires_at > datetime.utcnow())
            .order_by(UserSession.last_active_at.desc())
        )
        sessions = result.scalars().all()
        
        session_list = []
        for sess in sessions:
            location = None
            if sess.location_city or sess.location_country:
                location = f"{sess.location_city}, {sess.location_country}" if sess.location_city else sess.location_country
            
            session_list.append(SessionResponse(
                id=sess.id,
                device_type=sess.device_type,
                browser=sess.browser,
                operating_system=sess.operating_system,
                ip_address=sess.ip_address,
                location=location,
                last_active_at=sess.last_active_at.isoformat() if sess.last_active_at else None,
                created_at=sess.created_at.isoformat() if sess.created_at else None,
                is_current=sess.is_current,
            ))
        
        return SessionsListResponse(sessions=session_list, total=len(session_list))


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user_dependency),
):
    """Revoke a specific session."""
    async with get_db_session() as session:
        from sqlalchemy import select, update
        
        result = await session.execute(
            select(UserSession)
            .where(UserSession.id == session_id)
            .where(UserSession.user_id == current_user.id)
        )
        session_obj = result.scalar_one_or_none()
        
        if not session_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )
        
        if session_obj.is_current:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot revoke current session",
            )
        
        session_obj.is_revoked = True
        await session.commit()
        
        return {"message": "Session revoked successfully"}


@router.post("/sessions/revoke-all")
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user_dependency),
):
    """Revoke all sessions except the current one."""
    async with get_db_session() as session:
        from sqlalchemy import update
        
        await session.execute(
            update(UserSession)
            .where(UserSession.user_id == current_user.id)
            .where(UserSession.is_current == False)
            .values(is_revoked=True)
        )
        await session.commit()
        
        return {"message": "All other sessions revoked successfully"}


@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(
    current_user: User = Depends(get_current_user_dependency),
):
    """Setup 2FA - generate secret and QR code."""
    async with get_db_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(
            select(TwoFactorAuth).where(TwoFactorAuth.user_id == current_user.id)
        )
        two_fa = result.scalar_one_or_none()
        
        if two_fa and two_fa.is_enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA is already enabled",
            )
        
        if not two_fa:
            two_fa = TwoFactorAuth(user_id=current_user.id)
            session.add(two_fa)
        
        secret = two_fa.generate_secret()
        
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(
            name=current_user.email,
            issuer_name="AcmeDesk Assist"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        qr_code_b64 = base64.b64encode(buffer.getvalue()).decode()
        
        await session.commit()
        
        return TwoFactorSetupResponse(
            secret=secret,
            qr_code=f"data:image/png;base64,{qr_code_b64}",
            message="Scan the QR code with your authenticator app",
        )


@router.post("/2fa/enable")
async def enable_2fa(
    request: TwoFactorEnableRequest,
    current_user: User = Depends(get_current_user_dependency),
):
    """Enable 2FA with a verified TOTP code."""
    async with get_db_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(
            select(TwoFactorAuth).where(TwoFactorAuth.user_id == current_user.id)
        )
        two_fa = result.scalar_one_or_none()
        
        if not two_fa or not two_fa.secret_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA setup not initiated. Call /2fa/setup first.",
            )
        
        if not two_fa.verify_code(request.code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code",
            )
        
        backup_codes = two_fa.generate_backup_codes(10)
        
        two_fa.is_enabled = True
        two_fa.enabled_at = datetime.utcnow()
        
        await session.commit()
        
        return {
            "message": "2FA enabled successfully",
            "backup_codes": backup_codes,
        }


@router.post("/2fa/disable")
async def disable_2fa(
    request: Request,
    current_user: User = Depends(get_current_user_dependency),
):
    """Disable 2FA."""
    body = await request.json()
    code = body.get("code")
    
    async with get_db_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(
            select(TwoFactorAuth).where(TwoFactorAuth.user_id == current_user.id)
        )
        two_fa = result.scalar_one_or_none()
        
        if not two_fa or not two_fa.is_enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA is not enabled",
            )
        
        if not two_fa.verify_code(code) and not two_fa.verify_backup_code(code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code",
            )
        
        two_fa.is_enabled = False
        two_fa.secret_key = None
        two_fa.backup_codes_hash = None
        two_fa.backup_codes_count = 0
        two_fa.enabled_at = None
        
        await session.commit()
        
        return {"message": "2FA disabled successfully"}


@router.get("/2fa/status", response_model=TwoFactorStatusResponse)
async def get_2fa_status(
    current_user: User = Depends(get_current_user_dependency),
):
    """Get 2FA status for the current user."""
    async with get_db_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(
            select(TwoFactorAuth).where(TwoFactorAuth.user_id == current_user.id)
        )
        two_fa = result.scalar_one_or_none()
        
        if not two_fa:
            return TwoFactorStatusResponse(
                is_enabled=False,
                backup_codes_count=0,
                enabled_at=None,
            )
        
        return TwoFactorStatusResponse(
            is_enabled=two_fa.is_enabled,
            backup_codes_count=two_fa.get_remaining_backup_codes(),
            enabled_at=two_fa.enabled_at.isoformat() if two_fa.enabled_at else None,
        )


@router.post("/2fa/verify")
async def verify_2fa(
    request: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_user_dependency),
):
    """Verify a 2FA code (for testing or backup code verification)."""
    async with get_db_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(
            select(TwoFactorAuth).where(TwoFactorAuth.user_id == current_user.id)
        )
        two_fa = result.scalar_one_or_none()
        
        if not two_fa or not two_fa.is_enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA is not enabled",
            )
        
        is_valid = two_fa.verify_code(request.code) or two_fa.verify_backup_code(request.code)
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code",
            )
        
        return {"message": "Verification successful", "valid": True}
