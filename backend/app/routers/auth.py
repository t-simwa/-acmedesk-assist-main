"""
Authentication API endpoints.

Implements:
- POST /api/auth/register - User registration with tenant creation
- GET /api/auth/verify-email - Email verification
- POST /api/auth/login - User login with rate limiting
- POST /api/auth/refresh - Token refresh with rotation
- POST /api/auth/logout - Logout with token blacklist
- POST /api/auth/forgot-password - Password reset request
- POST /api/auth/reset-password - Password reset
- POST /api/auth/resend-verification - Resend verification email
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.exc import IntegrityError

from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, RedirectResponse
from typing import Union

from ..schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    TokenResponse,
    UserInfoResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    VerifyEmailResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
    LogoutResponse,
)
from ..models.user import User, UserRole
from ..models.tenant import Tenant, SubscriptionStatus
from ..models.chatbot_instance import ChatbotInstance, ChatbotStatus, WidgetPosition
from ..models.password_reset_token import PasswordResetToken
from ..models.two_factor_auth import TwoFactorAuth
from ..models.base import get_db_session
from ..services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_user_id,
)
from ..services.email import send_verification_email
from ..services.redis_service import redis_service
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# Rate limiting settings
LOGIN_RATE_LIMIT = 5
LOGIN_RATE_WINDOW = 900  # 15 minutes
RESEND_VERIFY_RATE_LIMIT = 3
RESEND_VERIFY_RATE_WINDOW = 3600  # 1 hour


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None
) -> User:
    """
    Get the current authenticated user from JWT token.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    # Check if token is blacklisted
    if redis_service.is_enabled and redis_service.is_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    async with get_db_session() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )
        
        return user


def get_client_ip(request: Request) -> str:
    """Get client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(request_data: RegisterRequest, request: Request) -> RegisterResponse:
    """
    Register a new user account with tenant and chatbot.

    This endpoint (per spec 3.1.1):
    1. Accepts email, password, business_name, full_name
    2. Hashes password with bcrypt
    3. Creates user + tenant + chatbot_instance in a SINGLE transaction
    4. Generates email verification token (UUID4)
    5. Sends verification email via SendGrid
    6. Returns 201 with NO JWT (must verify email first)
    """
    async with get_db_session() as session:
        # Check if user with this email already exists
        result = await session.execute(select(User).where(User.email == request_data.email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        # Generate IDs
        user_id = generate_user_id()
        tenant_id = str(uuid.uuid4())
        chatbot_id = str(uuid.uuid4())
        
        # Generate verification token
        verification_token = str(uuid.uuid4())
        verification_expires = datetime.utcnow() + timedelta(hours=24)
        
        # Hash password
        password_hash = hash_password(request_data.password)
        
        # Create tenant
        new_tenant = Tenant(
            id=tenant_id,
            business_name=request_data.business_name,
            subscription_status=SubscriptionStatus.TRIALING,
        )
        
        # Create user with tenant_id
        new_user = User(
            id=user_id,
            tenant_id=tenant_id,
            email=request_data.email,
            full_name=request_data.full_name,
            password_hash=password_hash,
            role=UserRole.OWNER,
            is_active=True,
            is_verified=False,
            verification_token=verification_token,
            verification_token_expires=verification_expires,
        )
        
        # Create default chatbot instance
        new_chatbot = ChatbotInstance(
            id=chatbot_id,
            tenant_id=tenant_id,
            name="Default Assistant",
            status=ChatbotStatus.PAUSED,
            widget_position=WidgetPosition.BOTTOM_RIGHT,
        )
        
        try:
            # Add all to session (single transaction)
            session.add(new_tenant)
            session.add(new_user)
            session.add(new_chatbot)
            
            await session.commit()
            await session.refresh(new_user)
            
            logger.info(f"New user registered: {request_data.email} (ID: {user_id}, Tenant: {tenant_id})")
            
            # Send verification email
            try:
                await send_verification_email(
                    to_email=request_data.email,
                    verification_token=verification_token,
                    user_name=request_data.full_name
                )
            except Exception as e:
                # Log but don't fail registration if email fails
                logger.error(f"Failed to send verification email: {e}")
            
            return RegisterResponse(
                message="Registration successful. Please check your email to verify your account.",
                user_id=user_id,
                email=request_data.email,
            )
            
        except IntegrityError:
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        except Exception as e:
            await session.rollback()
            logger.error(f"Error registering user: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to register user",
            )


@router.get("/verify-email")
async def verify_email(token: str, request: Request = None):
    """
    Verify email address using token (per spec 3.1.2).
    
    - Look up token
    - Mark user as verified
    - Delete token
    - Return redirect URL to frontend
    - Tokens expire after 24 hours
    - If expired, show "resend verification" option
    """
    frontend_url = str(settings.frontend_origin)
    
    async with get_db_session() as session:
        # Find user with this verification token
        result = await session.execute(
            select(User).where(User.verification_token == token)
        )
        user = result.scalar_one_or_none()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token",
            )
        
        # Check if token is expired
        if user.verification_token_expires and user.verification_token_expires < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired. Please request a new one.",
            )
        
        # Check if already verified
        if user.is_verified:
            return {"redirect_url": f"{frontend_url}/email-verified?already=true"}
        
        # Mark user as verified
        user.is_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        
        try:
            await session.commit()
            logger.info(f"Email verified for user: {user.email}")
            
            # Return redirect URL to frontend
            return {"redirect_url": f"{frontend_url}/email-verified"}
        except Exception as e:
            await session.rollback()
            logger.error(f"Error verifying email: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to verify email",
            )


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(request_data: ResendVerificationRequest, request: Request) -> ResendVerificationResponse:
    """
    Resend verification email (per spec 3.1.8).
    
    - Rate limited to 3 per hour per email
    - Generate new token
    - Send new email
    """
    client_ip = get_client_ip(request)
    rate_limit_key = f"resend_verify:{request_data.email}"
    
    # Check rate limit
    if redis_service.is_enabled:
        is_allowed, remaining = redis_service.check_rate_limit(
            rate_limit_key, 
            RESEND_VERIFY_RATE_LIMIT, 
            RESEND_VERIFY_RATE_WINDOW
        )
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many verification emails sent. Please try again later.",
            )
    
    async with get_db_session() as session:
        # Find user by email
        result = await session.execute(
            select(User).where(User.email == request_data.email)
        )
        user = result.scalar_one_or_none()
        
        # Always return success (security best practice)
        if user is None:
            return ResendVerificationResponse(
                message="If an account with that email exists, a verification link has been sent."
            )
        
        # If already verified, don't send again
        if user.is_verified:
            return ResendVerificationResponse(
                message="Email already verified. Please login."
            )
        
        # Generate new verification token
        verification_token = str(uuid.uuid4())
        verification_expires = datetime.utcnow() + timedelta(hours=24)
        
        user.verification_token = verification_token
        user.verification_token_expires = verification_expires
        
        try:
            await session.commit()
            
            # Send verification email
            await send_verification_email(
                to_email=request_data.email,
                verification_token=verification_token,
                user_name=user.full_name
            )
            
            logger.info(f"Verification email resent to: {request_data.email}")
            
            return ResendVerificationResponse(
                message="If an account with that email exists, a verification link has been sent."
            )
        except Exception as e:
            await session.rollback()
            logger.error(f"Error resending verification: {str(e)}")
            return ResendVerificationResponse(
                message="If an account with that email exists, a verification link has been sent."
            )


@router.post("/login", response_model=LoginResponse)
async def login(request_data: LoginRequest, request: Request) -> LoginResponse:
    """
    Authenticate a user and return JWT tokens (per spec 3.1.3).
    
    - Rate limit: 5 attempts per 15 minutes per IP
    - Check if user is verified (return 403 if not)
    - Return access token in body
    - Set refresh token in httpOnly cookie
    """
    client_ip = get_client_ip(request)
    rate_limit_key = f"login:{client_ip}"
    
    # Check rate limit
    if redis_service.is_enabled:
        is_allowed, remaining = redis_service.check_rate_limit(
            rate_limit_key, 
            LOGIN_RATE_LIMIT, 
            LOGIN_RATE_WINDOW
        )
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again in 15 minutes.",
                headers={"Retry-After": str(LOGIN_RATE_WINDOW)},
            )
    
    async with get_db_session() as session:
        # Find user by email
        result = await session.execute(select(User).where(User.email == request_data.email))
        user = result.scalar_one_or_none()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if account is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )
        
        # Check if email is verified (per spec)
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before logging in",
            )
        
        # Verify password
        if not user.password_hash or not verify_password(request_data.password, user.password_hash):
            # Increment rate limit on failed attempt
            if redis_service.is_enabled:
                redis_service.increment_rate_limit(rate_limit_key, LOGIN_RATE_WINDOW)
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Reset rate limit on successful login
        if redis_service.is_enabled:
            redis_service.reset_rate_limit(rate_limit_key)
        
        logger.info(f"User logged in: {request_data.email} (ID: {user.id})")
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        await session.commit()
        
        # Generate JWT tokens
        token_data = {
            "sub": user.id, 
            "email": user.email,
            "tenant_id": user.tenant_id,
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data, remember_me=request_data.remember_me or False)
        
        # Calculate expiration
        if request_data.remember_me:
            expires_in = settings.jwt_remember_me_expire_days * 24 * 60 * 60
        else:
            expires_in = settings.jwt_access_token_expire_minutes * 60
        
        tokens = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
        )
        
        # Check if 2FA is enabled
        result_2fa = await session.execute(
            select(TwoFactorAuth).where(TwoFactorAuth.user_id == user.id)
        )
        two_fa = result_2fa.scalar_one_or_none()
        requires_2fa = bool(two_fa and two_fa.is_enabled)
        
        response = LoginResponse(
            message="Login successful",
            user_id=user.id,
            email=user.email,
            name=user.full_name,
            role=user.role.value if user.role else "agent",
            tokens=tokens,
            requires_2fa=requires_2fa,
        )
        
        # Create response with httpOnly cookie for refresh token
        response = JSONResponse(
            content=response.model_dump(),
            headers={
                "Set-Cookie": f"refresh_token={refresh_token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age={settings.jwt_refresh_token_expire_days * 86400}"
            }
        )
        
        return response


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request) -> TokenResponse:
    """
    Refresh access token using refresh token (per spec 3.1.4).
    
    - Read refresh token from httpOnly cookie
    - Validate
    - Issue new access token
    - Rotate refresh token (invalidate old one in Redis blacklist)
    """
    # Get refresh token from cookie
    refresh_token_value = request.cookies.get("refresh_token")
    
    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if token is blacklisted
    if redis_service.is_enabled and redis_service.is_blacklisted(refresh_token_value):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(refresh_token_value)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    email = payload.get("email")
    tenant_id = payload.get("tenant_id")
    
    if user_id is None or email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify user still exists and is active
    async with get_db_session() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # Blacklist old refresh token (rotation)
    if redis_service.is_enabled:
        # Get token expiry to know how long to blacklist
        exp_timestamp = payload.get("exp", 0)
        current_timestamp = datetime.utcnow().timestamp()
        blacklist_seconds = int(exp_timestamp - current_timestamp) if exp_timestamp > current_timestamp else 3600
        redis_service.add_to_blacklist(refresh_token_value, blacklist_seconds)
    
    # Generate new tokens
    token_data = {"sub": user_id, "email": email, "tenant_id": tenant_id}
    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data, remember_me=False)
    
    # Calculate expiration
    expires_in = settings.jwt_access_token_expire_minutes * 60
    
    response = JSONResponse(
        content=TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=expires_in,
        ).model_dump(),
        headers={
            "Set-Cookie": f"refresh_token={new_refresh_token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age={settings.jwt_refresh_token_expire_days * 86400}"
        }
    )
    
    return response


@router.post("/logout", response_model=LogoutResponse)
async def logout(request: Request) -> LogoutResponse:
    """
    Logout endpoint (per spec 3.1.5).
    
    - Add current refresh token to Redis blacklist
    - Clear httpOnly cookie
    - Return 200
    """
    # Get refresh token from cookie
    refresh_token_value = request.cookies.get("refresh_token")
    
    if refresh_token_value and redis_service.is_enabled:
        # Blacklist the refresh token
        redis_service.add_to_blacklist(
            refresh_token_value, 
            settings.jwt_refresh_token_expire_days * 86400
        )
    
    # Return success with cookie clearing
    response = JSONResponse(
        content=LogoutResponse(message="Logged out successfully").model_dump(),
        headers={
            "Set-Cookie": "refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
        }
    )
    
    return response


@router.get("/me", response_model=UserInfoResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)) -> UserInfoResponse:
    """Get current authenticated user information."""
    return UserInfoResponse(
        user_id=current_user.id,
        email=current_user.email,
        name=current_user.full_name,
        role=current_user.role.value if current_user.role else "agent",
        is_active=current_user.is_active,
    )


@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    request_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user)
) -> ChangePasswordResponse:
    """Change password for authenticated user."""
    async with get_db_session() as session:
        result = await session.execute(select(User).where(User.id == current_user.id))
        user = result.scalar_one_or_none()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        # Verify current password
        if not user.password_hash or not verify_password(request_data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )
        
        # Check if new password is different
        if verify_password(request_data.new_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from current password",
            )
        
        # Hash new password
        new_password_hash = hash_password(request_data.new_password)
        
        # Update password
        user.password_hash = new_password_hash
        user.updated_at = datetime.utcnow()
        
        try:
            await session.commit()
            logger.info(f"Password changed for user: {user.email}")
            
            return ChangePasswordResponse(
                message="Password changed successfully"
            )
        except Exception as e:
            await session.rollback()
            logger.error(f"Error changing password: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to change password",
            )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(request_data: ForgotPasswordRequest) -> ForgotPasswordResponse:
    """
    Request password reset (per spec 3.1.6).
    
    - ALWAYS return 200 regardless of email existence
    - Generate reset token with 1-hour expiry
    - Send password reset email
    """
    async with get_db_session() as session:
        result = await session.execute(select(User).where(User.email == request_data.email))
        user = result.scalar_one_or_none()
        
        # Always return success (security best practice)
        if user is None or not user.is_active:
            return ForgotPasswordResponse(
                message="If an account with that email exists, a password reset link has been sent."
            )
        
        # Generate secure reset token
        reset_token = secrets.token_urlsafe(32)
        token_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Invalidate any existing reset tokens
        existing_tokens_result = await session.execute(
            select(PasswordResetToken)
            .where(
                and_(
                    PasswordResetToken.user_id == user.id,
                    PasswordResetToken.used == False
                )
            )
        )
        existing_tokens = existing_tokens_result.scalars().all()
        for token in existing_tokens:
            token.used = True
        
        # Create new reset token
        reset_token_obj = PasswordResetToken(
            id=token_id,
            user_id=user.id,
            token=reset_token,
            expires_at=expires_at,
            used=False,
        )
        
        try:
            session.add(reset_token_obj)
            await session.commit()
            
            # Send password reset email
            from ..services.email import email_service
            await email_service.send_password_reset_email(
                to_email=user.email,
                reset_token=reset_token,
                user_name=user.full_name
            )
            
            logger.info(f"Password reset requested for user: {user.email}")
            
            return ForgotPasswordResponse(
                message="If an account with that email exists, a password reset link has been sent."
            )
        except Exception as e:
            await session.rollback()
            logger.error(f"Error processing password reset request: {str(e)}")
            return ForgotPasswordResponse(
                message="If an account with that email exists, a password reset link has been sent."
            )


@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(request_data: ResetPasswordRequest) -> ResetPasswordResponse:
    """
    Reset password using reset token (per spec 3.1.7).
    
    - Verify token not expired and not already used
    - Hash new password
    - Update user
    - Mark token as used
    - Send confirmation email
    """
    async with get_db_session() as session:
        # Find reset token
        result = await session.execute(
            select(PasswordResetToken).where(PasswordResetToken.token == request_data.token)
        )
        reset_token_obj = result.scalar_one_or_none()
        
        if reset_token_obj is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )
        
        # Check if token is valid
        if not reset_token_obj.is_valid():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )
        
        # Get user
        user_result = await session.execute(
            select(User).where(User.id == reset_token_obj.user_id)
        )
        user = user_result.scalar_one_or_none()
        
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )
        
        # Hash new password
        new_password_hash = hash_password(request_data.new_password)
        
        # Update password
        user.password_hash = new_password_hash
        user.updated_at = datetime.utcnow()
        
        # Mark token as used
        reset_token_obj.used = True
        
        try:
            await session.commit()
            logger.info(f"Password reset completed for user: {user.email}")
            
            # Send password changed confirmation email (per spec 3.1.7)
            from ..services.email import email_service
            try:
                await email_service.send_password_changed_confirmation(
                    to_email=user.email,
                    user_name=user.full_name
                )
            except Exception as e:
                logger.error(f"Failed to send password changed email: {e}")
            
            return ResetPasswordResponse(
                message="Password reset successfully. You can now login with your new password."
            )
        except Exception as e:
            await session.rollback()
            logger.error(f"Error resetting password: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset password",
            )
