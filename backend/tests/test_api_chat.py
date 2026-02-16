"""
Tests for the chat endpoint with mocked RAG pipeline.

Tests:
- POST /api/chat with a simple in-memory RAG pipeline (can mock embedding/vector DB)
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.schemas.chat import SourceRef


@pytest_asyncio.fixture
async def client():
    """Create a test client for the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_rag_process():
    """Mock the RAG pipeline process_chat_query function."""
    with patch("app.routers.chat.rag.process_chat_query") as mock_process:
        # Default mock response
        mock_process.return_value = (
            "This is a test answer from the mocked RAG pipeline.",
            [
                SourceRef(
                    doc_id="test-doc-1",
                    chunk_index=0,
                    title="Test Document 1",
                    snippet="This is a test snippet from the document.",
                    score=0.95
                ),
                SourceRef(
                    doc_id="test-doc-2",
                    chunk_index=1,
                    title="Test Document 2",
                    snippet="Another test snippet.",
                    score=0.85
                )
            ]
        )
        yield mock_process


@pytest.fixture
def mock_database_save():
    """Mock the database save_conversation_turn function."""
    with patch("app.routers.chat.database.save_conversation_turn") as mock_save:
        mock_save.return_value = None
        yield mock_save


@pytest.mark.asyncio
async def test_chat_endpoint_returns_200(client, mock_rag_process, mock_database_save):
    """Test that POST /api/chat returns HTTP 200 status code."""
    response = await client.post(
        "/api/chat",
        json={
            "session_id": "test-session-123",
            "message": "What is AcmeDesk?"
        }
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_chat_endpoint_returns_expected_structure(client, mock_rag_process, mock_database_save):
    """Test that POST /api/chat returns the expected response structure."""
    response = await client.post(
        "/api/chat",
        json={
            "session_id": "test-session-123",
            "message": "What is AcmeDesk?"
        }
    )
    assert response.status_code == 200
    
    data = response.json()
    
    # Verify required fields are present
    assert "answer" in data
    assert "sources" in data
    assert "metadata" in data
    
    # Verify answer is a string
    assert isinstance(data["answer"], str)
    assert len(data["answer"]) > 0
    
    # Verify sources is a list
    assert isinstance(data["sources"], list)
    
    # Verify metadata structure
    metadata = data["metadata"]
    assert "session_id" in metadata
    assert "query_time_ms" in metadata
    assert "sources_count" in metadata
    assert "timestamp" in metadata


@pytest.mark.asyncio
async def test_chat_endpoint_with_sources(client, mock_rag_process, mock_database_save):
    """Test that POST /api/chat returns sources when RAG pipeline provides them."""
    response = await client.post(
        "/api/chat",
        json={
            "session_id": "test-session-123",
            "message": "What is AcmeDesk?"
        }
    )
    assert response.status_code == 200
    
    data = response.json()
    sources = data["sources"]
    
    # Verify sources structure
    assert len(sources) > 0
    for source in sources:
        assert "doc_id" in source
        assert "chunk_index" in source
        assert isinstance(source["doc_id"], str)
        assert isinstance(source["chunk_index"], int)


@pytest.mark.asyncio
async def test_chat_endpoint_metadata_values(client, mock_rag_process, mock_database_save):
    """Test that POST /api/chat returns correct metadata values."""
    session_id = "test-session-456"
    response = await client.post(
        "/api/chat",
        json={
            "session_id": session_id,
            "message": "Tell me about pricing"
        }
    )
    assert response.status_code == 200
    
    data = response.json()
    metadata = data["metadata"]
    
    # Verify metadata values
    assert metadata["session_id"] == session_id
    assert isinstance(metadata["query_time_ms"], (int, float))
    assert metadata["query_time_ms"] >= 0
    assert metadata["sources_count"] == len(data["sources"])
    assert isinstance(metadata["timestamp"], str)
    assert len(metadata["timestamp"]) > 0


@pytest.mark.asyncio
async def test_chat_endpoint_without_session_id(client, mock_rag_process, mock_database_save):
    """Test that POST /api/chat works without session_id (optional field)."""
    response = await client.post(
        "/api/chat",
        json={
            "message": "Hello"
        }
    )
    assert response.status_code == 200
    
    data = response.json()
    assert "answer" in data
    assert data["metadata"]["session_id"] is None or data["metadata"]["session_id"] == ""


@pytest.mark.asyncio
async def test_chat_endpoint_validates_message_required(client):
    """Test that POST /api/chat validates that message is required."""
    response = await client.post(
        "/api/chat",
        json={
            "session_id": "test-session"
        }
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_chat_endpoint_validates_message_not_empty(client):
    """Test that POST /api/chat validates that message is not empty."""
    response = await client.post(
        "/api/chat",
        json={
            "session_id": "test-session",
            "message": ""
        }
    )
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_chat_endpoint_calls_rag_pipeline(client, mock_rag_process, mock_database_save):
    """Test that POST /api/chat calls the RAG pipeline with correct parameters."""
    test_message = "What is AcmeDesk?"
    test_session_id = "test-session-789"
    
    response = await client.post(
        "/api/chat",
        json={
            "session_id": test_session_id,
            "message": test_message
        }
    )
    assert response.status_code == 200
    
    # Verify RAG pipeline was called with correct query
    mock_rag_process.assert_called_once()
    call_args = mock_rag_process.call_args
    assert call_args[1]["query"] == test_message
    assert call_args[1]["top_k"] == 5


@pytest.mark.asyncio
async def test_chat_endpoint_calls_database_save(client, mock_rag_process, mock_database_save):
    """Test that POST /api/chat calls database.save_conversation_turn."""
    test_message = "Test message"
    test_session_id = "test-session-db"
    
    response = await client.post(
        "/api/chat",
        json={
            "session_id": test_session_id,
            "message": test_message
        }
    )
    assert response.status_code == 200
    
    # Verify database save was called
    mock_database_save.assert_called_once()
    call_args = mock_database_save.call_args[1]
    assert call_args["session_id"] == test_session_id
    assert call_args["message"] == test_message
    assert "answer" in call_args
    assert "sources_count" in call_args
    assert "query_time_ms" in call_args
