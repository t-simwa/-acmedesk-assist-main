"""
Chat API endpoints.

Implements:
- POST /api/chat - Process a chat message and return an answer with sources
- GET /api/chat/stream - Stream a chat response using Server-Sent Events (SSE)
"""

import json
import logging
import time
from datetime import datetime
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from ..schemas.chat import ChatRequest, ChatResponse, ChatMetadata
from ..services import database, rag

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Process a chat message and return an answer with sources.

    This endpoint:
    1. Validates the request body
    2. Logs the query and start time
    3. Calls the RAG pipeline to get answer + sources
    4. Persists the conversation turn to the database
    5. Returns a structured response

    Args:
        request: ChatRequest containing session_id (optional) and message

    Returns:
        ChatResponse with answer, sources, and metadata

    Raises:
        HTTPException: If request validation fails or processing error occurs
    """
    # Validate request body (Pydantic handles this automatically, but we log it)
    logger.info(
        "Received chat request: session_id=%s, message_length=%s",
        request.session_id,
        len(request.message),
    )

    # Record start time for query processing
    start_time = time.time()

    try:
        # Call RAG pipeline to get answer + sources
        # This uses placeholder functions that will be replaced in Section B
        answer, sources = await rag.process_chat_query(query=request.message, top_k=5)

        # Calculate query processing time
        query_time_ms = (time.time() - start_time) * 1000

        # Persist conversation turn to database
        # This uses a placeholder function that will be replaced in Section C
        await database.save_conversation_turn(
            session_id=request.session_id,
            message=request.message,
            answer=answer,
            sources_count=len(sources),
            query_time_ms=query_time_ms,
        )

        # Build metadata
        metadata = ChatMetadata(
            session_id=request.session_id,
            query_time_ms=round(query_time_ms, 2),
            sources_count=len(sources),
            model=None,  # Will be populated when LLM integration is complete
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

        # Build and return response
        response = ChatResponse(
            answer=answer,
            sources=sources,
            metadata=metadata,
        )

        logger.info(
            "Chat request processed successfully: session_id=%s, query_time_ms=%.2f, "
            "sources_count=%s",
            request.session_id,
            query_time_ms,
            len(sources),
        )

        return response

    except Exception as e:
        # Log the error
        query_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "Error processing chat request: %s, session_id=%s, query_time_ms=%.2f",
            str(e),
            request.session_id,
            query_time_ms,
            exc_info=True,
        )

        # Return a 500 error with a user-friendly message
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your request: {str(e)}",
        )


async def _sse_chat_stream_generator(
    request: ChatRequest, http_request: Request
) -> AsyncGenerator[bytes, None]:
    """
    Internal helper to stream a chat response as SSE events.

    For now, this streams:
    - A small \"start\" event
    - A single \"message\" event containing the full ChatResponse
    - A final \"end\" event

    Once true streaming from the LLM is implemented, this generator can
    yield partial tokens/chunks instead.
    """
    logger.info(
        "Starting SSE chat stream: session_id=%s, message_length=%s",
        request.session_id,
        len(request.message),
    )

    start_time = time.time()

    # Send a start event
    start_event = "event: start\ndata: {}\n\n"
    yield start_event.encode("utf-8")

    try:
        # Call the same RAG pipeline used by the non-streaming endpoint
        answer, sources = await rag.process_chat_query(query=request.message, top_k=5)
        query_time_ms = (time.time() - start_time) * 1000

        # Persist conversation turn (same as non-streaming endpoint)
        await database.save_conversation_turn(
            session_id=request.session_id,
            message=request.message,
            answer=answer,
            sources_count=len(sources),
            query_time_ms=query_time_ms,
        )

        metadata = ChatMetadata(
            session_id=request.session_id,
            query_time_ms=round(query_time_ms, 2),
            sources_count=len(sources),
            model=None,
            timestamp=datetime.utcnow().isoformat() + "Z",
        )

        response = ChatResponse(answer=answer, sources=sources, metadata=metadata)

        # Main message event with the full response payload
        payload = response.model_dump()
        message_event = f"event: message\ndata: {json.dumps(payload)}\n\n"
        yield message_event.encode("utf-8")

        logger.info(
            "SSE chat stream completed: session_id=%s, query_time_ms=%.2f, "
            "sources_count=%s",
            request.session_id,
            query_time_ms,
            len(sources),
        )

    except Exception as e:
        logger.error(
            "Error in SSE chat stream: %s, session_id=%s",
            str(e),
            request.session_id,
            exc_info=True,
        )
        error_event = f"event: error\ndata: {json.dumps({'detail': str(e)})}\n\n"
        yield error_event.encode("utf-8")

    finally:
        # End event to signal completion
        end_event = "event: end\ndata: {}\n\n"
        yield end_event.encode("utf-8")


@router.post(
    "/stream",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
)
async def chat_stream(request: ChatRequest, http_request: Request) -> StreamingResponse:
    """
    Stream a chat response using Server-Sent Events (SSE).

    This endpoint accepts the same payload as `POST /api/chat` but returns a
    streaming response where events are sent incrementally.

    Current behavior:
    - Streams a `start` event
    - Streams a single `message` event with the full ChatResponse
    - Streams an `end` event

    Once LLM streaming is implemented, this endpoint can be updated to send
    partial tokens/chunks as they are generated.
    """
    generator = _sse_chat_stream_generator(request=request, http_request=http_request)
    return StreamingResponse(generator, media_type="text/event-stream")
