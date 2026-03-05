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
        full_name: User's full name (required)
        business_name: Business name for tenant creation (required)
    """

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, description="User's password (minimum 8 characters)")
    full_name: str = Field(..., min_length=1, max_length=200, description="User's full name")
    business_name: str = Field(..., min_length=1, max_length=255, description="Business name")

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
    """

    message: str = Field(..., description="Success message")
    user_id: str = Field(..., description="ID of the newly created user")
    email: str = Field(..., description="Email address of the newly created user")


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
        requires_2fa: Whether 2FA verification is required
    """

    message: str = Field(..., description="Success message")
    user_id: str = Field(..., description="ID of the authenticated user")
    email: str = Field(..., description="Email address of the authenticated user")
    name: Optional[str] = Field(None, description="Name of the authenticated user")
    role: str = Field(..., description="Role of the authenticated user")
    tokens: TokenResponse = Field(..., description="JWT tokens")
    requires_2fa: bool = Field(False, description="Whether 2FA verification is required")


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


class ChangePasswordRequest(BaseModel):
    """
    Request model for changing password.

    Attributes:
        current_password: User's current password
        new_password: User's new password (must meet strength requirements)
    """

    current_password: str = Field(..., description="User's current password")
    new_password: str = Field(..., min_length=8, description="User's new password (minimum 8 characters)")

    @field_validator("new_password")
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


class ChangePasswordResponse(BaseModel):
    """
    Response model for password change.

    Attributes:
        message: Success message
    """

    message: str = Field(..., description="Success message")


class ForgotPasswordRequest(BaseModel):
    """
    Request model for forgot password.

    Attributes:
        email: User's email address
    """

    email: EmailStr = Field(..., description="User's email address")


class ForgotPasswordResponse(BaseModel):
    """
    Response model for forgot password.

    Attributes:
        message: Success message
    """

    message: str = Field(..., description="Success message")


class ResetPasswordRequest(BaseModel):
    """
    Request model for resetting password.

    Attributes:
        token: Password reset token from email
        new_password: User's new password (must meet strength requirements)
    """

    token: str = Field(..., description="Password reset token from email")
    new_password: str = Field(..., min_length=8, description="User's new password (minimum 8 characters)")

    @field_validator("new_password")
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


class ResetPasswordResponse(BaseModel):
    """
    Response model for password reset.

    Attributes:
        message: Success message
    """

    message: str = Field(..., description="Success message")


class ResetPasswordTokenStatus(str, Enum):
    """Status of a password reset token."""

    VALID = "valid"
    EXPIRED = "expired"
    USED = "used"
    INVALID = "invalid"


class ResetPasswordTokenStatusResponse(BaseModel):
    """
    Response model for validating a password reset token.

    Attributes:
        status: Current status of the token (valid, expired, used, invalid)
    """

    status: ResetPasswordTokenStatus = Field(..., description="Status of the reset token")


class VerifyEmailRequest(BaseModel):
    """
    Request model for email verification.

    Attributes:
        token: Email verification token
    """

    token: str = Field(..., description="Email verification token")


class VerifyEmailResponse(BaseModel):
    """
    Response model for email verification.

    Attributes:
        message: Success message
    """

    message: str = Field(..., description="Success message")


class ResendVerificationRequest(BaseModel):
    """
    Request model for resending verification email.

    Attributes:
        email: User's email address
    """

    email: EmailStr = Field(..., description="User's email address")


class ResendVerificationResponse(BaseModel):
    """
    Response model for resending verification email.

    Attributes:
        message: Success message
    """

    message: str = Field(..., description="Success message")


class LogoutResponse(BaseModel):
    """
    Response model for logout.

    Attributes:
        message: Success message
    """

    message: str = Field(..., description="Success message")
