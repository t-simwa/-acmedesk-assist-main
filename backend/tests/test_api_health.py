"""
Tests for the health endpoint.

Tests:
- GET /api/health returns 200 and expected payload
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest_asyncio.fixture
async def client():
    """Create a test client for the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_endpoint_returns_200(client):
    """Test that /api/health returns HTTP 200 status code."""
    response = await client.get("/api/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_endpoint_returns_expected_payload(client):
    """Test that /api/health returns the expected JSON payload structure."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    
    data = response.json()
    
    # Verify required fields are present
    assert "status" in data
    assert "version" in data
    assert "service" in data
    
    # Verify field values
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"
    assert isinstance(data["service"], str)
    assert len(data["service"]) > 0


@pytest.mark.asyncio
async def test_health_endpoint_response_type(client):
    """Test that /api/health returns JSON content type."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert "application/json" in response.headers.get("content-type", "")
