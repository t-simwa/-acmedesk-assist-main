"""
Email unsubscribe endpoints for non-transactional email categories.

Implements Milestone 13.2.5:
- One-click unsubscribe links in email footers for non-transactional emails.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from jose import JWTError, jwt
from sqlalchemy import select

from ..config import settings
from ..models.base import get_db_session
from ..models.user_preferences import UserPreferences


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/email", tags=["email"])


def create_unsubscribe_token(user_id: str, category: str, expires_at: Optional[datetime] = None) -> str:
  """
  Helper used by email templates to generate unsubscribe tokens.

  The payload is intentionally simple:
  - sub: user_id
  - category: email category to unsubscribe from
  - type: 'unsubscribe'
  - exp: optional expiry
  """
  payload: Dict[str, Any] = {
      "sub": user_id,
      "category": category,
      "type": "unsubscribe",
  }
  if expires_at is not None:
      payload["exp"] = int(expires_at.timestamp())
  return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


@router.get(
    "/unsubscribe",
    response_class=HTMLResponse,
    status_code=status.HTTP_200_OK,
)
async def email_unsubscribe(token: str = Query(..., description="Signed unsubscribe token")) -> HTMLResponse:
    """
    One-click unsubscribe endpoint for non-transactional emails.

    The token is a signed JWT that encodes:
    - sub: user_id
    - category: category to unsubscribe from (e.g. daily_summary, weekly_report, reengagement, referral_reward)
    - type: 'unsubscribe'
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired unsubscribe link.",
        )

    user_id = payload.get("sub")
    category = payload.get("category")
    token_type = payload.get("type")

    if not user_id or not category or token_type != "unsubscribe":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid unsubscribe token.",
        )

    # Persist unsubscribe preference for this user + category
    async with get_db_session() as session:
        result = await session.execute(
            select(UserPreferences).where(UserPreferences.user_id == user_id)
        )
        prefs = result.scalar_one_or_none()

        if prefs is None:
            # Create minimal preferences row if none exists
            prefs = UserPreferences(
                id=str(__import__("uuid").uuid4()),
                user_id=user_id,
                notifications_email=True,
                notifications_in_app=True,
                notifications_push=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(prefs)

        additional = prefs.additional_preferences or {}
        email_unsubs = additional.get("email_unsubscribes", {})
        email_unsubs[category] = True
        additional["email_unsubscribes"] = email_unsubs
        prefs.additional_preferences = additional
        prefs.updated_at = datetime.utcnow()

        await session.commit()

    logger.info(f"User {user_id} unsubscribed from '{category}' emails via one-click link.")

    # Return a very simple branded HTML confirmation
    html = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Email preferences updated</title>
        <style>
          body {{
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background-color: #070B14;
            color: #E5E7EB;
          }}
          .container {{
            max-width: 480px;
            margin: 80px auto;
            padding: 32px 24px;
            background: #0D1117;
            border-radius: 16px;
            border: 1px solid rgba(148, 163, 184, 0.35);
            box-shadow: 0 24px 80px rgba(15, 23, 42, 0.65);
          }}
          h1 {{
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 8px;
            background: linear-gradient(135deg, #4F8EF7, #7C3AED);
            -webkit-background-clip: text;
            color: transparent;
          }}
          p {{
            font-size: 14px;
            line-height: 1.6;
            color: #9CA3AF;
            margin: 0 0 8px;
          }}
          .muted {{
            font-size: 12px;
            color: #6B7280;
            margin-top: 12px;
          }}
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Email preferences updated</h1>
          <p>You’ve been unsubscribed from <strong>{category.replace("_", " ").title()}</strong> emails.</p>
          <p class="muted">This change applies only to non-transactional emails. You may still receive important security or billing-related messages.</p>
        </div>
      </body>
    </html>
    """
    return HTMLResponse(content=html)

