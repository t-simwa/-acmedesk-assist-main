"""
Tests for announcement banner storage and dashboard summary inclusion.
"""

import pytest
import pytest_asyncio
from unittest.mock import MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.routers import admin as admin_router
from app.routers import dashboard as dashboard_router
from app.models import base
from app.models.setting import Setting


async def _make_owner():
    u = MagicMock()
    u.id = "owner-id"
    u.tenant_id = "t1"
    u.role = MagicMock(value="owner")
    u.email = "owner@example.com"
    return u


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def override_admin_auth():
    """Stub get_current_user for admin routes so owner_checker passes."""
    app.dependency_overrides[admin_router.get_current_user] = _make_owner
    yield
    app.dependency_overrides.pop(admin_router.get_current_user, None)


@pytest.fixture
def override_dashboard_auth():
    app.dependency_overrides[dashboard_router.get_current_user] = _make_owner
    yield
    app.dependency_overrides.pop(dashboard_router.get_current_user, None)


@pytest_asyncio.fixture
async def clear_settings():
    # ensure settings table exists and clean
    await base.fix_schema()
    async with base.get_session_factory()() as session:
        await session.execute(Setting.__table__.delete())
        await session.commit()
    yield


@pytest.mark.asyncio
async def test_announcement_lifecycle(client, override_admin_auth, clear_settings):
    # initially no announcement -> GET returns 404
    resp = await client.get("/api/admin/announcement")
    assert resp.status_code == 404

    # create an announcement
    payload = {
        "type": "info",
        "message": "Test banner",
        "start_date": None,
        "end_date": None,
    }
    resp2 = await client.put("/api/admin/announcement", json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["message"] == "Test banner"
    ann_id = data2["id"]

    # GET now returns the same
    resp3 = await client.get("/api/admin/announcement")
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert data3["id"] == ann_id
    assert data3["type"] == "info"


@pytest.mark.asyncio
async def test_dashboard_summary_includes_announcement(client, override_dashboard_auth, clear_settings):
    # write announcement directly via database helper for control
    from app.services import database
    ann = {
        "type": "warning",
        "message": "Heads up!",
        "start_date": None,
        "end_date": None,
    }
    await database.update_announcement(ann)

    resp = await client.get("/api/dashboard/summary")
    assert resp.status_code == 200
    summary = resp.json()
    assert "announcement" in summary
    assert summary["announcement"]["message"] == "Heads up!"
