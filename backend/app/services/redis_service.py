"""
Redis service for rate limiting, session management, and token blacklist.

This service provides:
- Rate limiting (e.g., 5 login attempts per 15 minutes)
- Token blacklist for logout and token rotation
- Session management
"""

import logging
import os
from typing import Optional

import redis

from ..config import settings

logger = logging.getLogger(__name__)


class RedisService:
    """Redis service for rate limiting and token management."""

    def __init__(self):
        """Initialize Redis connection."""
        self._client: Optional[redis.Redis] = None
        self._enabled = False
        
        # Check if Redis URL is configured
        redis_url = getattr(settings, 'redis_url', None) or os.environ.get("REDIS_URL")
        
        if redis_url:
            try:
                self._client = redis.from_url(redis_url, decode_responses=True)
                # Test connection
                self._client.ping()
                self._enabled = True
                logger.info("Redis connection established")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Rate limiting disabled.")
                self._enabled = False
        else:
            logger.warning("REDIS_URL not configured. Rate limiting disabled.")

    @property
    def client(self) -> Optional[redis.Redis]:
        """Get Redis client (None if not available)."""
        return self._client

    @property
    def is_enabled(self) -> bool:
        """Check if Redis is available and enabled."""
        return self._enabled and self._client is not None

    # ==================== Rate Limiting ====================

    def check_rate_limit(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        """
        Check if a rate limit is exceeded.
        
        Args:
            key: Unique identifier (e.g., "login:ip:192.168.1.1")
            limit: Maximum number of attempts allowed
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (is_allowed, remaining_attempts)
        """
        if not self.is_enabled:
            # If Redis not available, allow the request
            return True, limit

        try:
            current = self._client.get(key)
            if current is None:
                # First attempt
                self._client.setex(key, window_seconds, 1)
                return True, limit - 1
            
            current_count = int(current)
            if current_count >= limit:
                # Rate limit exceeded
                return False, 0
            
            # Increment counter
            self._client.incr(key)
            return True, limit - current_count - 1
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # On error, allow the request
            return True, limit

    def increment_rate_limit(self, key: str, window_seconds: int) -> int:
        """
        Increment a rate limit counter.
        
        Args:
            key: Unique identifier
            window_seconds: Time window in seconds
            
        Returns:
            Current count after increment
        """
        if not self.is_enabled:
            return 0

        try:
            current = self._client.get(key)
            if current is None:
                self._client.setex(key, window_seconds, 1)
                return 1
            
            count = int(current) + 1
            self._client.setex(key, window_seconds, count)
            return count
        except Exception as e:
            logger.error(f"Rate limit increment failed: {e}")
            return 0

    def reset_rate_limit(self, key: str) -> bool:
        """
        Reset a rate limit counter.
        
        Args:
            key: Unique identifier
            
        Returns:
            True if successful
        """
        if not self.is_enabled:
            return True

        try:
            self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Rate limit reset failed: {e}")
            return False

    # ==================== Token Blacklist ====================

    def add_to_blacklist(self, token: str, expires_in_seconds: int) -> bool:
        """
        Add a token to the blacklist (for logout or rotation).
        
        Args:
            token: The token to blacklist
            expires_in_seconds: How long to keep the token blacklisted
            
        Returns:
            True if successful
        """
        if not self.is_enabled:
            return True

        try:
            # Use JWT's jti (unique identifier) as key if available
            # For simplicity, we hash the token
            import hashlib
            key = f"blacklist:{hashlib.sha256(token.encode()).hexdigest()}"
            self._client.setex(key, expires_in_seconds, "1")
            return True
        except Exception as e:
            logger.error(f"Token blacklist add failed: {e}")
            return False

    def is_blacklisted(self, token: str) -> bool:
        """
        Check if a token is blacklisted.
        
        Args:
            token: The token to check
            
        Returns:
            True if token is blacklisted
        """
        if not self.is_enabled:
            return False

        try:
            import hashlib
            key = f"blacklist:{hashlib.sha256(token.encode()).hexdigest()}"
            return self._client.exists(key) > 0
        except Exception as e:
            logger.error(f"Token blacklist check failed: {e}")
            return False

    def remove_from_blacklist(self, token: str) -> bool:
        """
        Remove a token from the blacklist.
        
        Args:
            token: The token to unblacklist
            
        Returns:
            True if successful
        """
        if not self.is_enabled:
            return True

        try:
            import hashlib
            key = f"blacklist:{hashlib.sha256(token.encode()).hexdigest()}"
            self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Token blacklist remove failed: {e}")
            return False

    # ==================== Session Management ====================

    def store_session(
        self,
        session_id: str,
        user_id: str,
        data: dict,
        expires_in_seconds: int = 86400
    ) -> bool:
        """
        Store session data.
        
        Args:
            session_id: Unique session identifier
            user_id: User ID
            data: Session data (user_agent, ip, etc.)
            expires_in_seconds: Session expiration (default 24 hours)
            
        Returns:
            True if successful
        """
        if not self.is_enabled:
            return True

        try:
            import json
            key = f"session:{session_id}"
            session_data = {"user_id": user_id, **data}
            self._client.setex(key, expires_in_seconds, json.dumps(session_data))
            return True
        except Exception as e:
            logger.error(f"Session store failed: {e}")
            return False

    def get_session(self, session_id: str) -> Optional[dict]:
        """
        Get session data.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Session data or None
        """
        if not self.is_enabled:
            return None

        try:
            import json
            key = f"session:{session_id}"
            data = self._client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Session get failed: {e}")
            return None

    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            True if successful
        """
        if not self.is_enabled:
            return True

        try:
            key = f"session:{session_id}"
            self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Session delete failed: {e}")
            return False


# Global Redis service instance
redis_service = RedisService()
