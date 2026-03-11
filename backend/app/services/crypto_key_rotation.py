"""Helpers for rotating the encryption key used for stored OAuth tokens.

This utility decrypts existing ChannelConfig.oauth_tokens using the provided
old key and re-encrypts them with the provided new key. It does not modify
the running process settings; callers should update process environment and
restart services after rotation.
"""
from __future__ import annotations

import logging
import base64
import json
from typing import Optional

from cryptography.fernet import Fernet
from sqlalchemy import select

from ..models.base import get_db_session
from ..models.channel_config import ChannelConfig

logger = logging.getLogger(__name__)


def _fernet_from_key(key: str) -> Fernet:
    k = key.encode("utf-8")
    if len(k) != 44:
        k = base64.urlsafe_b64encode(k.ljust(32, b"0")[:32])
    return Fernet(k)


async def rotate_encryption_key(old_key: str, new_key: str) -> int:
    """Rotate encryption of oauth_tokens from old_key -> new_key.

    Returns the number of rows successfully rotated.
    """
    old_f = _fernet_from_key(old_key)
    new_f = _fernet_from_key(new_key)

    rotated = 0
    async with get_db_session() as session:
        stmt = select(ChannelConfig).where(ChannelConfig.oauth_tokens.isnot(None))
        res = await session.execute(stmt)
        rows = res.scalars().all()

        for cfg in rows:
            blob = cfg.oauth_tokens
            if not blob:
                continue
            try:
                # Try decrypting with old key
                plain = old_f.decrypt(blob.encode("utf-8"))
                # re-encrypt with new key
                new_blob = new_f.encrypt(plain).decode("utf-8")
                cfg.oauth_tokens = new_blob
                rotated += 1
            except Exception as e:
                # Not all tokens may have been encrypted with old key (skip)
                logger.warning("Skipping rotation for cfg %s: %s", getattr(cfg, "id", "?"), e)

        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Failed to persist rotated tokens: %s", e)
            raise

    return rotated
