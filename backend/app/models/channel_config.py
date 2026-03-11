"""
Per-tenant channel configuration model.

Stores enabled state and arbitrarily-structured settings for each
communication channel. OAuth tokens are stored as an opaque JSON/text
blob — service layers should encrypt/decrypt as needed (not implemented
at model level).
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ChannelConfig(Base):
    """Tenant-scoped configuration for a single channel.

    Fields:
    - tenant_id: owning tenant UUID
    - channel: canonical channel key (whatsapp, email, sms, messenger, instagram, widget)
    - enabled: whether the tenant has enabled the channel
    - connected: whether provider credentials are connected/verified
    - config: JSON blob for channel-specific settings
    - oauth_tokens: optional opaque token storage (JSON string)
    - created_at/updated_at timestamps
    """

    __tablename__ = "channel_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    connected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    oauth_tokens: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "channel": self.channel,
            "enabled": self.enabled,
            "connected": self.connected,
            "config": self.config or {},
            "has_oauth_tokens": bool(self.oauth_tokens),
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
