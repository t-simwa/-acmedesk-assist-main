"""
Pydantic schemas for authentication API requests and responses.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class RegisterRequest(BaseModel):
    """
    Request model for user registration.

    Attributes:
        email: User's email address (must be valid email format)
        password: User's password (must meet strength requirements)
        name: User's full name (optional)
    """

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, description="User's password (minimum 8 characters)")
    name: Optional[str] = Field(None, max_length=200, description="User's full name")

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Validate password strength requirements:
        - Minimum 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        """
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v


class LoginRequest(BaseModel):
    """
    Request model for user login.

    Attributes:
        email: User's email address
        password: User's password
        remember_me: Whether to extend token expiration (optional)
    """

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")
    remember_me: Optional[bool] = Field(False, description="Whether to extend token expiration")


class TokenResponse(BaseModel):
    """
    Response model for authentication endpoints returning tokens.

    Attributes:
        access_token: JWT access token
        refresh_token: JWT refresh token
        token_type: Token type (typically "bearer")
        expires_in: Access token expiration time in seconds
    """

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration time in seconds")


class RegisterResponse(BaseModel):
    """
    Response model for user registration.

    Attributes:
        message: Success message
        user_id: ID of the newly created user
        email: Email address of the newly created user
        tokens: JWT tokens (access and refresh)
    """

    message: str = Field(..., description="Success message")
    user_id: str = Field(..., description="ID of the newly created user")
    email: str = Field(..., description="Email address of the newly created user")
    tokens: TokenResponse = Field(..., description="JWT tokens")


class LoginResponse(BaseModel):
    """
    Response model for user login.

    Attributes:
        message: Success message
        user_id: ID of the authenticated user
        email: Email address of the authenticated user
        name: Name of the authenticated user
        role: Role of the authenticated user
        tokens: JWT tokens (access and refresh)
    """

    message: str = Field(..., description="Success message")
    user_id: str = Field(..., description="ID of the authenticated user")
    email: str = Field(..., description="Email address of the authenticated user")
    name: Optional[str] = Field(None, description="Name of the authenticated user")
    role: str = Field(..., description="Role of the authenticated user")
    tokens: TokenResponse = Field(..., description="JWT tokens")


class RefreshTokenRequest(BaseModel):
    """
    Request model for token refresh.

    Attributes:
        refresh_token: JWT refresh token
    """

    refresh_token: str = Field(..., description="JWT refresh token")


class UserInfoResponse(BaseModel):
    """
    Response model for current user info.

    Attributes:
        user_id: ID of the user
        email: Email address of the user
        name: Name of the user
        role: Role of the user
        is_active: Whether the user account is active
    """

    user_id: str = Field(..., description="ID of the user")
    email: str = Field(..., description="Email address of the user")
    name: Optional[str] = Field(None, description="Name of the user")
    role: str = Field(..., description="Role of the user")
    is_active: bool = Field(..., description="Whether the user account is active")
