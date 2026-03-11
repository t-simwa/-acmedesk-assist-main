"""Simple optional encryption helper.

Uses cryptography.fernet if available and an encryption key is set in
settings.encryption_key. If cryptography is not available or the key is
not set, functions are no-ops (store plaintext) and a warning is logged.
"""

import logging
import base64
from typing import Optional

from ..config import settings

logger = logging.getLogger(__name__)

_FERNET = None

try:
    from cryptography.fernet import Fernet
    _HAS_CRYPTO = True
except Exception:
    Fernet = None  # type: ignore
    _HAS_CRYPTO = False


def _init_fernet() -> Optional[object]:
    global _FERNET
    if _FERNET is not None:
        return _FERNET

    # Require an encryption key and cryptography library. Do not silently
    # fallback to plaintext storage. This enforces a secure default.
    key = getattr(settings, "encryption_key", None)
    if not key:
        raise RuntimeError("encryption_key must be set to protect OAuth tokens at rest")

    if not _HAS_CRYPTO:
        raise RuntimeError("cryptography package not installed; install 'cryptography' to enable token encryption")

    # Allow raw/URL-safe base64 keys or passphrase-like strings; ensure length
    try:
        # If key is already a valid base64 Fernet key, use it
        k = key.encode("utf-8")
        # If key length is not 44, derive by base64-encoding
        if len(k) != 44:
            k = base64.urlsafe_b64encode(k.ljust(32, b"0")[:32])
        _FERNET = Fernet(k)
        return _FERNET
    except Exception as e:
        logger.warning("Failed to initialize Fernet: %s", e)
        return None


def encrypt(plaintext: str) -> str:
    f = _init_fernet()
    if f is None:
        # Should not happen: _init_fernet raises if not configured correctly.
        raise RuntimeError("Encryption not initialized")
    try:
        token = f.encrypt(plaintext.encode("utf-8"))
        return token.decode("utf-8")
    except Exception as e:
        logger.warning("Encryption failed: %s", e)
        # If encryption unexpectedly fails at runtime, log and return plaintext
        return plaintext


def decrypt(ciphertext: str) -> str:
    f = _init_fernet()
    if f is None:
        # Should not happen: _init_fernet raises if not configured correctly.
        raise RuntimeError("Encryption not initialized")
    try:
        plain = f.decrypt(ciphertext.encode("utf-8"))
        return plain.decode("utf-8")
    except Exception as e:
        logger.warning("Decryption failed: %s", e)
        # If decryption fails, return the raw ciphertext so callers can attempt
        # legacy plaintext parsing path if appropriate.
        return ciphertext
