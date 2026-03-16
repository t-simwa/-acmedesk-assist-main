"""Export job tracking for large data exports.

Export jobs allow asynchronous generation of export artifacts (CSV/ZIP/PDF) and
provide a simple polling API for clients to retrieve a download link once ready.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import String, DateTime, Text, JSON, Boolean, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ExportJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class ExportJobKind(str, Enum):
    CSV = "csv"
    ZIP = "zip"
    PDF = "pdf"


class ExportJob(Base):
    """Persisted export job metadata."""

    __tablename__ = "export_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    kind: Mapped[ExportJobKind] = mapped_column(SQLEnum(ExportJobKind), nullable=False, default=ExportJobKind.CSV)
    status: Mapped[ExportJobStatus] = mapped_column(SQLEnum(ExportJobStatus), nullable=False, default=ExportJobStatus.PENDING)
    filters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    row_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
