"""
Password reset token model for secure password reset functionality.
"""

from datetime import datetime, timedelta
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class PasswordResetToken(Base):
    """Password reset token model for secure password reset."""
    
    __tablename__ = "password_reset_tokens"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    
    def is_valid(self) -> bool:
        """Check if token is valid (not used and not expired)."""
        return not self.used and datetime.utcnow() < self.expires_at
    
    def to_dict(self) -> dict:
        """Convert model to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "token": self.token,
            "expires_at": self.expires_at.isoformat() + "Z" if self.expires_at else None,
            "used": self.used,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
