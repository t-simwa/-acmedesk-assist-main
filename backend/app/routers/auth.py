"""
Authentication API endpoints.

Implements:
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
"""

import logging
from datetime import datetime, timedelta
from sqlalchemy import select
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
)
from ..models.user import User, UserRole
from ..models.base import get_db_session
from ..services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_user_id,
)
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
