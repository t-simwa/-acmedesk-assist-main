"""
Tests for the chatbot configuration endpoints (/api/chatbot).

The 422 error reported by the frontend was caused by the request
model rejecting an extra `role_text` field that the UI was sending.  The
API should accept `role_text` and persist it along with other partial
updates.  This file exercises both GET and PUT and verifies that
validation works and that fields are round‑tripped.
"""

import pytest
import pytest_asyncio
from unittest.mock import MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.routers import chatbot as chatbot_router
from app.models.chatbot_instance import ChatbotInstance
from app.models import base


# simplified user object for dependency override
async def _make_mock_user():
    u = MagicMock()
    u.id = "test-user-id"
    u.tenant_id = "t1"
    return u


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def override_chatbot_auth():
    """Override get_current_user to avoid needing real auth."""

    app.dependency_overrides[chatbot_router.get_current_user] = _make_mock_user
    yield
    app.dependency_overrides.pop(chatbot_router.get_current_user, None)


@pytest_asyncio.fixture
async def ensure_chatbot_exists():
    """Create a default ChatbotInstance in the test database for tenant t1."""
    # make sure schema/tables exist (other tests call base.fix_schema)
    await base.fix_schema()
    async with base.get_session_factory()() as session:
        # remove any pre-existing record for a clean state
        from app.models.chatbot_instance import ChatbotInstance as CI
        await session.execute(
            CI.__table__.delete().where(CI.tenant_id == "t1")
        )
        bot = ChatbotInstance(
            id="bot1",
            tenant_id="t1",
            name="Original",
            status="live"
        )
        session.add(bot)
        await session.commit()
    yield


@pytest.mark.asyncio
async def test_get_config_returns_200_and_data(client, override_chatbot_auth, ensure_chatbot_exists):
    resp = await client.get("/api/chatbot/config")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Original"
    # even fields we didn't set should appear (defaults)
    assert "brand_color" in data


@pytest.mark.asyncio
async def test_put_config_updates_name_and_role_text(client, override_chatbot_auth, ensure_chatbot_exists):
    # update name only
    resp = await client.put("/api/chatbot/config", json={"name": "NewName"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "NewName"

    # update role_text along with another field
    resp2 = await client.put("/api/chatbot/config", json={"role_text": "Helper", "brand_color": "#ff0000"})
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["role_text"] == "Helper"
    assert data2["brand_color"] == "#ff0000"


@pytest.mark.asyncio
async def test_put_config_rejects_unknown_fields(client, override_chatbot_auth, ensure_chatbot_exists):
    # send a field that isn't permitted and expect 422
    resp = await client.put("/api/chatbot/config", json={"not_a_field": "x"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_put_config_accepts_comma_separated_lists(client, override_chatbot_auth, ensure_chatbot_exists):
    # keyword_triggers and email lists may be sent as CSV strings
    payload = {
        "keyword_triggers": "urgent, refund ,  help",
        "escalation_email_addresses": "a@example.com,b@example.com",
        "notification_email_addresses": "n1@x.com, n2@x.com",
    }
    resp = await client.put("/api/chatbot/config", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["keyword_triggers"] == ["urgent", "refund", "help"]
    assert data["escalation_email_addresses"] == ["a@example.com", "b@example.com"]
    assert data["notification_email_addresses"] == ["n1@x.com", "n2@x.com"]


@pytest.mark.asyncio
async def test_put_config_coerces_numeric_threshold(client, override_chatbot_auth, ensure_chatbot_exists):
    resp = await client.put("/api/chatbot/config", json={"unanswered_questions_threshold": 7})
    assert resp.status_code == 200
    data = resp.json()
    # backend stores as string because column is varchar
    assert data["unanswered_questions_threshold"] == "7"


@pytest.mark.asyncio
async def test_put_config_strips_null_starter_questions(client, override_chatbot_auth, ensure_chatbot_exists):
    resp = await client.put(
        "/api/chatbot/config",
        json={"suggested_starter_questions": [None, "hi", "", None]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("suggested_starter_questions") == ["hi"]
