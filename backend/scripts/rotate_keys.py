"""Rotate encryption keys for stored OAuth token blobs.

Usage:
  python backend/scripts/rotate_keys.py --old OLD_KEY --new NEW_KEY [--yes]

Notes:
- This script decrypts all non-null ChannelConfig.oauth_tokens using OLD_KEY
  and re-encrypts them with NEW_KEY.
- Run this from the repository root. Ensure your environment variables are set
  (DATABASE_URL, ENCRYPTION_KEY if needed for runtime, etc.).
- Always backup your database before running this operation.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
import logging

from app.services.crypto_key_rotation import rotate_encryption_key

logger = logging.getLogger("rotate_keys")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Rotate encryption keys for OAuth token blobs")
    p.add_argument("--old", required=True, help="Old encryption key (Fernet key or passphrase)")
    p.add_argument("--new", required=True, help="New encryption key (Fernet key or passphrase)")
    p.add_argument("--yes", action="store_true", help="Skip confirmation prompt")
    return p.parse_args()


async def _run(old_key: str, new_key: str) -> int:
    # Call the async rotation helper
    n = await rotate_encryption_key(old_key, new_key)
    return n


def main() -> None:
    args = parse_args()

    if not args.yes:
        print("WARNING: This will attempt to rotate encryption for all stored oauth_tokens in the database.")
        print("Make sure you have a DB backup and that the OLD key can decrypt existing blobs.")
        ok = input("Continue? [y/N]: ").strip().lower()
        if ok not in ("y", "yes"):
            print("Aborted by user.")
            sys.exit(1)

    try:
        rotated = asyncio.run(_run(args.old, args.new))
        print(f"Rotated {rotated} rows")
    except Exception as e:
        logger.exception("Rotation failed: %s", e)
        print("Rotation failed:", e)
        sys.exit(2)


if __name__ == "__main__":
    main()
