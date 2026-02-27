"""
Google OAuth API endpoints.

Implements:
- GET /api/auth/oauth/google/url - Get Google OAuth URL
- POST /api/auth/oauth/google/callback - Handle Google OAuth callback
"""

import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select

from ..models.user import User, UserRole
from ..models.tenant import Tenant, SubscriptionStatus
from ..models.chatbot_instance import ChatbotInstance, ChatbotStatus, WidgetPosition
from ..models.base import get_db_session
from ..schemas.auth import TokenResponse
from ..services.auth import create_access_token, create_refresh_token, hash_password
from ..config import settings
from ..services.email import send_welcome_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/oauth", tags=["oauth"])

GOOGLE_CLIENT_ID = getattr(settings, "google_client_id", None)
GOOGLE_CLIENT_SECRET = getattr(settings, "google_client_secret", None)
GOOGLE_REDIRECT_URI = getattr(settings, "google_redirect_uri", "http://localhost:5173/login/oauth/callback")


class GoogleOAuthCallbackRequest(BaseModel):
    code: str = Field(..., description="Authorization code from Google")


class GoogleOAuthUrlResponse(BaseModel):
    url: str


class GoogleOAuthResponse(BaseModel):
    message: str
    user_id: str
    email: str
    name: Optional[str]
    tokens: TokenResponse


def get_google_oauth_url() -> str:
    """Generate Google OAuth URL."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )
    
    import urllib.parse
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"


@router.get("/google/url", response_model=GoogleOAuthUrlResponse)
async def get_google_url():
    """Get Google OAuth URL for initiating OAuth flow."""
    try:
        url = get_google_oauth_url()
        return GoogleOAuthUrlResponse(url=url)
    except Exception as e:
        logger.error(f"Error generating Google OAuth URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )


@router.post("/google/callback", response_model=GoogleOAuthResponse)
async def google_callback(request: GoogleOAuthCallbackRequest, http_request: Request):
    """Handle Google OAuth callback."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )
    
    import httpx
    
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": request.code,
        "grant_type": "authorization_code",
        "redirect_uri": GOOGLE_REDIRECT_URI,
    }
    
    async with httpx.AsyncClient() as client:
        try:
            token_response = await client.post(token_url, data=token_data)
            token_response.raise_for_status()
            tokens = token_response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Error exchanging code for tokens: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange authorization code",
            )
        
        access_token = tokens.get("access_token")
        
        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        userinfo_headers = {"Authorization": f"Bearer {access_token}"}
        
        try:
            userinfo_response = await client.get(userinfo_url, headers=userinfo_headers)
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Error fetching user info: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch user information",
            )
    
    email = userinfo.get("email")
    name = userinfo.get("name")
    google_id = userinfo.get("id")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google",
        )
    
    async with get_db_session() as session:
        result = await session.execute(
            select(User).where(User.email == email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            if existing_user.password_hash:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this email already exists. Please login with your password.",
                )
            
            existing_user.is_verified = True
            await session.commit()
            user = existing_user
        else:
            tenant = Tenant(
                business_name=name or email.split("@")[0],
                subscription_status=SubscriptionStatus.TRIAL,
            )
            session.add(tenant)
            await session.flush()
            
            password = secrets.token_urlsafe(16)
            
            user = User(
                id=str(secrets.uuid4()),
                tenant_id=tenant.id,
                email=email,
                password_hash=hash_password(password),
                full_name=name,
                role=UserRole.OWNER,
                is_verified=True,
            )
            session.add(user)
            
            chatbot = ChatbotInstance(
                id=str(secrets.uuid4()),
                tenant_id=tenant.id,
                name="Support Bot",
                status=ChatbotStatus.PAUSED,
                greeting_message="Hi! I'm your AI assistant. How can I help you today?",
                fallback_message="I'm not sure I understand. Would you like to speak with our team?",
                widget_position=WidgetPosition.BOTTOM_RIGHT,
                show_citations=True,
                show_typing=True,
                show_powered_by=True,
            )
            session.add(chatbot)
            
            await session.commit()
            
            try:
                await send_welcome_email(email, name or "User")
            except Exception as e:
                logger.warning(f"Failed to send welcome email: {e}")
        
        jwt_access_token = create_access_token(data={"sub": user.id, "tenant_id": user.tenant_id})
        jwt_refresh_token = create_refresh_token(data={"sub": user.id, "tenant_id": user.tenant_id})
        
        return GoogleOAuthResponse(
            message="Google OAuth login successful",
            user_id=user.id,
            email=user.email,
            name=user.full_name,
            tokens=TokenResponse(
                access_token=jwt_access_token,
                refresh_token=jwt_refresh_token,
                token_type="bearer",
                expires_in=3600,
            ),
        )


@router.get("/google/status")
async def oauth_google_status():
    """Check if Google OAuth is configured."""
    return {
        "enabled": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "client_id_set": bool(GOOGLE_CLIENT_ID),
    }
