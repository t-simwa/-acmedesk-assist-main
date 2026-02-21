"""
Authentication API endpoints.

Implements:
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.exc import IntegrityError

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

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
)
from ..models.user import User, UserRole
from ..models.password_reset_token import PasswordResetToken
from ..models.base import get_db_session
from ..services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_user_id,
)
from ..services.email import email_service
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Get the current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        User model instance

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
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


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest) -> RegisterResponse:
    """
    Register a new user account.

    This endpoint:
    1. Validates the request (email format, password strength)
    2. Checks if email already exists
    3. Hashes the password
    4. Creates a new user in the database
    5. Generates JWT tokens
    6. Returns user info and tokens

    Args:
        request: RegisterRequest containing email, password, and optional name

    Returns:
        RegisterResponse with user info and JWT tokens

    Raises:
        HTTPException: If email already exists or validation fails
    """
    async with get_db_session() as session:
        # Check if user with this email already exists
        result = await session.execute(select(User).where(User.email == request.email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        
        # Hash password
        password_hash = hash_password(request.password)
        
        # Generate user ID
        user_id = generate_user_id()
        
        # Create new user
        new_user = User(
            id=user_id,
            email=request.email,
            name=request.name,
            password_hash=password_hash,
            role=UserRole.VIEWER,  # Default role
            is_active=True,
        )
        
        try:
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            
            logger.info(f"New user registered: {request.email} (ID: {user_id})")
            
            # Generate JWT tokens
            token_data = {"sub": user_id, "email": request.email}
            access_token = create_access_token(token_data)
            refresh_token = create_refresh_token(token_data, remember_me=False)
            
            tokens = TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=settings.jwt_access_token_expire_minutes * 60,
            )
            
            return RegisterResponse(
                message="User registered successfully",
                user_id=user_id,
                email=request.email,
                tokens=tokens,
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


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(request: LoginRequest) -> LoginResponse:
    """
    Authenticate a user and return JWT tokens.

    This endpoint:
    1. Validates the request (email and password)
    2. Finds the user by email
    3. Verifies the password
    4. Checks if account is active
    5. Generates JWT tokens (with extended expiration if remember_me is True)
    6. Returns user info and tokens

    Args:
        request: LoginRequest containing email, password, and optional remember_me

    Returns:
        LoginResponse with user info and JWT tokens

    Raises:
        HTTPException: If credentials are invalid or account is inactive
    """
    async with get_db_session() as session:
        # Find user by email
        result = await session.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()
        
        if user is None:
            # Don't reveal if email exists or not (security best practice)
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
        
        # Verify password
        if not user.password_hash or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"User logged in: {request.email} (ID: {user.id})")
        
        # Generate JWT tokens
        token_data = {"sub": user.id, "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data, remember_me=request.remember_me or False)
        
        # Calculate expiration based on remember_me
        if request.remember_me:
            expires_in = settings.jwt_remember_me_expire_days * 24 * 60 * 60
        else:
            expires_in = settings.jwt_access_token_expire_minutes * 60
        
        tokens = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
        )
        
        return LoginResponse(
            message="Login successful",
            user_id=user.id,
            email=user.email,
            name=user.name,
            role=user.role.value,
            tokens=tokens,
        )


@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def refresh_token(request: RefreshTokenRequest) -> TokenResponse:
    """
    Refresh access token using refresh token.

    This endpoint:
    1. Validates the refresh token
    2. Extracts user information from token
    3. Generates new access and refresh tokens
    4. Returns new tokens

    Args:
        request: RefreshTokenRequest containing refresh_token

    Returns:
        TokenResponse with new access and refresh tokens

    Raises:
        HTTPException: If refresh token is invalid or expired
    """
    payload = decode_token(request.refresh_token)
    
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
    
    # Generate new tokens
    token_data = {"sub": user_id, "email": email}
    access_token = create_access_token(token_data)
    # Use same remember_me setting as original (check if token was long-lived)
    exp_timestamp = payload.get("exp", 0)
    current_timestamp = datetime.utcnow().timestamp()
    remember_me = (exp_timestamp - current_timestamp) > (7 * 24 * 60 * 60)
    refresh_token = create_refresh_token(token_data, remember_me=remember_me)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


@router.get("/me", response_model=UserInfoResponse, status_code=status.HTTP_200_OK)
async def get_current_user_info(current_user: User = Depends(get_current_user)) -> UserInfoResponse:
    """
    Get current authenticated user information.

    This endpoint requires a valid JWT access token in the Authorization header.

    Args:
        current_user: Current authenticated user (from dependency)

    Returns:
        UserInfoResponse with user information
    """
    return UserInfoResponse(
        user_id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role.value,
        is_active=current_user.is_active,
    )


@router.post("/change-password", response_model=ChangePasswordResponse, status_code=status.HTTP_200_OK)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user)
) -> ChangePasswordResponse:
    """
    Change password for authenticated user.

    This endpoint:
    1. Verifies the current password
    2. Validates the new password strength
    3. Updates the password hash in the database

    Args:
        request: ChangePasswordRequest containing current_password and new_password
        current_user: Current authenticated user (from dependency)

    Returns:
        ChangePasswordResponse with success message

    Raises:
        HTTPException: If current password is incorrect or validation fails
    """
    async with get_db_session() as session:
        # Reload user in this session to ensure we're working with the same session
        result = await session.execute(select(User).where(User.id == current_user.id))
        user = result.scalar_one_or_none()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        # Verify current password
        if not user.password_hash or not verify_password(request.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )
        
        # Check if new password is different from current password
        if verify_password(request.new_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from current password",
            )
        
        # Hash new password
        new_password_hash = hash_password(request.new_password)
        
        # Update password
        user.password_hash = new_password_hash
        user.updated_at = datetime.utcnow()
        
        try:
            await session.commit()
            logger.info(f"Password changed for user: {user.email} (ID: {user.id})")
            
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


@router.post("/forgot-password", response_model=ForgotPasswordResponse, status_code=status.HTTP_200_OK)
async def forgot_password(request: ForgotPasswordRequest) -> ForgotPasswordResponse:
    """
    Request password reset by sending email with reset token.

    This endpoint:
    1. Finds user by email
    2. Generates secure reset token
    3. Stores token in database with expiration (1 hour)
    4. Sends password reset email

    Args:
        request: ForgotPasswordRequest containing email

    Returns:
        ForgotPasswordResponse with success message (always returns success for security)

    Note:
        Always returns success message even if email doesn't exist (security best practice)
    """
    async with get_db_session() as session:
        # Find user by email
        result = await session.execute(select(User).where(User.email == request.email))
        user = result.scalar_one_or_none()
        
        # Always return success message (security best practice - don't reveal if email exists)
        if user is None or not user.is_active:
            # Still return success to prevent email enumeration
            return ForgotPasswordResponse(
                message="If an account with that email exists, a password reset link has been sent."
            )
        
        # Generate secure reset token
        reset_token = secrets.token_urlsafe(32)
        token_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Invalidate any existing reset tokens for this user
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
            await email_service.send_password_reset_email(
                to_email=user.email,
                reset_token=reset_token,
                user_name=user.name
            )
            
            logger.info(f"Password reset requested for user: {user.email} (ID: {user.id})")
            
            return ForgotPasswordResponse(
                message="If an account with that email exists, a password reset link has been sent."
            )
        except Exception as e:
            await session.rollback()
            logger.error(f"Error processing password reset request: {str(e)}")
            # Still return success to prevent information leakage
            return ForgotPasswordResponse(
                message="If an account with that email exists, a password reset link has been sent."
            )


@router.post("/reset-password", response_model=ResetPasswordResponse, status_code=status.HTTP_200_OK)
async def reset_password(request: ResetPasswordRequest) -> ResetPasswordResponse:
    """
    Reset password using reset token from email.

    This endpoint:
    1. Validates the reset token (checks expiration and usage)
    2. Finds the associated user
    3. Validates new password strength
    4. Updates password hash
    5. Marks token as used

    Args:
        request: ResetPasswordRequest containing token and new_password

    Returns:
        ResetPasswordResponse with success message

    Raises:
        HTTPException: If token is invalid, expired, or already used
    """
    async with get_db_session() as session:
        # Find reset token
        result = await session.execute(
            select(PasswordResetToken).where(PasswordResetToken.token == request.token)
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
        new_password_hash = hash_password(request.new_password)
        
        # Update password
        user.password_hash = new_password_hash
        user.updated_at = datetime.utcnow()
        
        # Mark token as used
        reset_token_obj.used = True
        
        try:
            await session.commit()
            logger.info(f"Password reset completed for user: {user.email} (ID: {user.id})")
            
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
