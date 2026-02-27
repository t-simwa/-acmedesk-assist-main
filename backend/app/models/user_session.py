"""
User session model for active session tracking.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship

from ..models.base import Base


class UserSession(Base):
    """
    Active user session model.
    
    Stores session information including device details,
    IP address, and location for security tracking.
    """
    
    __tablename__ = "user_sessions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    
    device_type = Column(String(50), nullable=True)
    browser = Column(String(100), nullable=True)
    operating_system = Column(String(100), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    ip_address = Column(String(45), nullable=True)
    location_country = Column(String(100), nullable=True)
    location_city = Column(String(100), nullable=True)
    
    last_active_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    
    is_current = Column(Boolean, default=False)
    is_revoked = Column(Boolean, default=False)
    
    metadata_json = Column(JSON, default=dict)
    
    user = relationship("User", back_populates="sessions")
    
    def __repr__(self):
        return f"<UserSession {self.id} user_id={self.user_id} device={self.device_type}>"
    
    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at
    
    @property
    def display_name(self) -> str:
        parts = []
        if self.browser:
            parts.append(self.browser)
        if self.device_type:
            parts.append(self.device_type)
        if self.location_city:
            parts.append(f"from {self.location_city}")
        return " ".join(parts) if parts else "Unknown device"
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "device_type": self.device_type,
            "browser": self.browser,
            "operating_system": self.operating_system,
            "ip_address": self.ip_address,
            "location": f"{self.location_city}, {self.location_country}" if self.location_city or self.location_country else None,
            "last_active_at": self.last_active_at.isoformat() if self.last_active_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_current": self.is_current,
            "is_revoked": self.is_revoked,
        }
