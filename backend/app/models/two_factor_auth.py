"""
Two-Factor Authentication (TOTP) model.
"""

import uuid
import secrets
import hashlib
from datetime import datetime
from typing import Optional, List

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from ..models.base import Base


class TwoFactorAuth(Base):
    """
    Two-Factor Authentication settings for a user.
    
    Stores TOTP secret, backup codes, and enabled status.
    """
    
    __tablename__ = "two_factor_auth"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    is_enabled = Column(Boolean, default=False)
    secret_key = Column(String(32), nullable=True)
    
    backup_codes_hash = Column(Text, nullable=True)
    backup_codes_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    enabled_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="two_factor_auth")
    
    def generate_secret(self) -> str:
        """Generate a new TOTP secret."""
        self.secret_key = secrets.token_hex(20)
        return self.secret_key
    
    def verify_code(self, code: str) -> bool:
        """Verify a TOTP code using pyotp."""
        if not self.secret_key or not self.is_enabled:
            return False
        
        import pyotp
        totp = pyotp.TOTP(self.secret_key)
        return totp.verify(code, valid_window=1)
    
    def generate_backup_codes(self, count: int = 10) -> List[str]:
        """Generate backup codes and store hashed version."""
        codes = [secrets.token_hex(4).upper() for _ in range(count)]
        
        hashed_codes = []
        for code in codes:
            hashed = hashlib.sha256(code.encode()).hexdigest()
            hashed_codes.append(hashed)
        
        self.backup_codes_hash = "|".join(hashed_codes)
        self.backup_codes_count = count
        
        return codes
    
    def verify_backup_code(self, code: str) -> bool:
        """Verify a backup code."""
        if not self.backup_codes_hash:
            return False
        
        code_upper = code.upper()
        hashed_input = hashlib.sha256(code_upper.encode()).hexdigest()
        
        codes_list = self.backup_codes_hash.split("|")
        if hashed_input in codes_list:
            codes_list.remove(hashed_input)
            self.backup_codes_hash = "|".join(codes_list)
            self.backup_codes_count = len(codes_list)
            return True
        
        return False
    
    def get_remaining_backup_codes(self) -> int:
        """Get count of remaining backup codes."""
        return self.backup_codes_count
    
    def to_dict(self, include_secret: bool = False) -> dict:
        result = {
            "id": self.id,
            "is_enabled": self.is_enabled,
            "backup_codes_count": self.backup_codes_count,
            "enabled_at": self.enabled_at.isoformat() if self.enabled_at else None,
        }
        
        if include_secret and self.secret_key:
            result["secret_key"] = self.secret_key
            
        return result
