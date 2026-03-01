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

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from ..schemas.chat import ChatRequest, ChatResponse, ChatMetadata
from ..models.user import User
from ..routers.auth import get_current_user
from ..services import database, rag

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
) -> ChatResponse:
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
        # Get active knowledge base IDs for the user
        active_kb_ids = await database.get_active_knowledge_base_ids(current_user.id)
        
        # Call RAG pipeline to get answer + sources (filtered by user_id and active KBs)
        answer, sources = await rag.process_chat_query(
            query=request.message, 
            top_k=5, 
            user_id=current_user.id,
            active_kb_ids=active_kb_ids
        )

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
            user_id=current_user.id,
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
    request: ChatRequest, http_request: Request, user_id: str
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
        # Get active knowledge base IDs for the user
        active_kb_ids = await database.get_active_knowledge_base_ids(user_id)
        
        # Call the same RAG pipeline used by the non-streaming endpoint (filtered by user_id and active KBs)
        answer, sources = await rag.process_chat_query(
            query=request.message, 
            top_k=5, 
            user_id=user_id,
            active_kb_ids=active_kb_ids
        )
        query_time_ms = (time.time() - start_time) * 1000

        # Persist conversation turn (same as non-streaming endpoint)
        await database.save_conversation_turn(
            session_id=request.session_id,
            message=request.message,
            answer=answer,
            sources_count=len(sources),
            query_time_ms=query_time_ms,
            user_id=user_id,
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
async def chat_stream(
    request: ChatRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user)
) -> StreamingResponse:
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
    generator = _sse_chat_stream_generator(request=request, http_request=http_request, user_id=current_user.id)
    return StreamingResponse(generator, media_type="text/event-stream")


# =============================================================================
# Widget-specific endpoints (Milestone 6)
# =============================================================================

from ..schemas.chat import (
    WidgetConfigResponse,
    WidgetMessageRequest,
    WidgetMessageResponse,
    WidgetLeadRequest,
    WidgetLeadResponse,
    WidgetFeedbackRequest,
    WidgetFeedbackResponse,
)
from ..models.base import get_db_session
from ..models.chatbot_instance import ChatbotInstance
from ..models.conversation import Conversation
from ..models.message import Message
from ..models.lead import Lead
from ..services import database
from sqlalchemy import select


async def validate_domain(request: Request, chatbot_id: str) -> ChatbotInstance:
    """
    Validate that the request origin is in the chatbot's allowed domains.
    
    Raises HTTPException 403 if domain is not allowed.
    """
    origin = request.headers.get("origin") or request.headers.get("referer")
    
    async with get_db_session() as session:
        result = await session.execute(
            select(ChatbotInstance).where(ChatbotInstance.id == chatbot_id)
        )
        chatbot = result.scalar_one_or_none()
    
    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found"
        )
    
    if origin and chatbot.allowed_domains:
        from urllib.parse import urlparse
        origin_domain = urlparse(origin).netloc
        
        allowed = False
        for domain in chatbot.allowed_domains:
            if origin_domain == domain or origin_domain.endswith(f".{domain}"):
                allowed = True
                break
        
        if not allowed:
            logger.warning(f"Unauthorized domain access attempt: {origin_domain} for chatbot {chatbot_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized domain — add this domain in your dashboard"
            )
    
    return chatbot


@router.get("/config/{chatbot_id}", response_model=WidgetConfigResponse)
async def get_widget_config(
    chatbot_id: str,
    request: Request
) -> WidgetConfigResponse:
    """
    Get widget configuration for a chatbot.
    
    Validates the request origin against domain whitelist.
    Returns configuration (never secrets like API keys).
    """
    chatbot = await validate_domain(request, chatbot_id)
    
    suggested_questions = []
    try:
        from ..models.knowledge_base import KnowledgeBase
        async with get_db_session() as session:
            result = await session.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.tenant_id == chatbot.tenant_id,
                    KnowledgeBase.is_active == True
                )
            )
            kb = result.scalar_one_or_none()
            if kb and hasattr(kb, 'suggested_questions') and kb.suggested_questions:
                suggested_questions = kb.suggested_questions[:5]
    except Exception:
        pass
    
    return WidgetConfigResponse(
        chatbotId=chatbot.id,
        apiUrl=str(request.base_url).rstrip("/"),
        name=chatbot.name,
        avatarUrl=chatbot.avatar_url,
        brandColor=chatbot.brand_color,
        secondaryColor=chatbot.secondary_color,
        greetingMessage=chatbot.greeting_message or "Hi! How can I help you today?",
        fallbackMessage=chatbot.fallback_message or "I'm not sure about that. Would you like to speak with our team?",
        escalationMessage=chatbot.escalation_message or "Let me connect you with our team.",
        offlineMessage=chatbot.offline_message,
        responseTone=chatbot.response_tone.value if chatbot.response_tone else "professional",
        responseLength=chatbot.response_length.value if chatbot.response_length else "medium",
        showCitations=chatbot.show_citations,
        showTyping=chatbot.show_typing,
        showPoweredBy=chatbot.show_powered_by,
        position=chatbot.widget_position.value if chatbot.widget_position else "bottom_right",
        suggestedQuestions=suggested_questions
    )


@router.post("/widget/message", response_model=WidgetMessageResponse)
async def widget_message(
    request_data: WidgetMessageRequest,
    request: Request
) -> WidgetMessageResponse:
    """
    Process a message from the widget.
    
    Creates or continues a conversation, processes through RAG,
    and returns the AI response.
    """
    chatbot_id = request_data.session_id.split("-")[0] if request_data.session_id else None
    
    chatbot = None
    if chatbot_id:
        async with get_db_session() as session:
            result = await session.execute(
                select(ChatbotInstance).where(ChatbotInstance.id == chatbot_id)
            )
            chatbot = result.scalar_one_or_none()
    
    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found"
        )
    
    await validate_domain(request, chatbot.id)
    
    start_time = time.time()
    
    try:
        conversation = None
        if request_data.conversation_id:
            async with get_db_session() as session:
                result = await session.execute(
                    select(Conversation).where(Conversation.id == request_data.conversation_id)
                )
                conversation = result.scalar_one_or_none()
        
        if not conversation:
            conversation_id = f"conv_{request_data.session_id}_{int(datetime.utcnow().timestamp())}"
            async with get_db_session() as session:
                conversation = Conversation(
                    id=conversation_id,
                    tenant_id=chatbot.tenant_id,
                    chatbot_id=chatbot.id,
                    channel="web",
                    status="active",
                    session_id=request_data.session_id,
                    started_at=datetime.utcnow()
                )
                session.add(conversation)
                await session.commit()
                conversation = await session.get(Conversation, conversation_id)
        
        user_message_id = f"msg_{int(datetime.utcnow().timestamp() * 1000)}"
        async with get_db_session() as session:
            user_message = Message(
                id=user_message_id,
                conversation_id=conversation.id,
                role="user",
                content=request_data.message,
                created_at=datetime.utcnow()
            )
            session.add(user_message)
            await session.commit()
        
        history_text = ""
        for hist_msg in request_data.history[-10:]:
            history_text += f"{hist_msg.get('role', 'user')}: {hist_msg.get('content', '')}\n"
        
        full_query = f"{history_text}User: {request_data.message}".strip() if history_text else request_data.message
        
        active_kb_ids = await database.get_active_knowledge_base_ids_by_tenant(chatbot.tenant_id)
        
        answer, sources = await rag.process_chat_query(
            query=full_query,
            top_k=5,
            user_id=chatbot.tenant_id,
            active_kb_ids=active_kb_ids
        )
        
        query_time_ms = (time.time() - start_time) * 1000
        
        assistant_message_id = f"msg_{int(datetime.utcnow().timestamp() * 1000) + 1}"
        async with get_db_session() as session:
            assistant_message = Message(
                id=assistant_message_id,
                conversation_id=conversation.id,
                role="assistant",
                content=answer,
                created_at=datetime.utcnow()
            )
            session.add(assistant_message)
            await session.commit()
        
        sources_list = []
        for src in sources:
            if hasattr(src, 'get'):
                sources_list.append({
                    "filename": src.get("title", "Unknown"),
                    "page_number": src.get("page_number"),
                    "excerpt": (src.get("snippet", "") or "")[:200]
                })
            else:
                sources_list.append({
                    "filename": "Unknown",
                    "page_number": None,
                    "excerpt": ""
                })
        
        return WidgetMessageResponse(
            answer=answer,
            sources=sources_list,
            conversation_id=conversation.id,
            metadata={
                "query_time_ms": round(query_time_ms, 2),
                "sources_count": len(sources_list)
            }
        )
        
    except Exception as e:
        logger.error(f"Error processing widget message: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message"
        )


@router.post("/widget/lead", response_model=WidgetLeadResponse)
async def widget_lead(
    request_data: WidgetLeadRequest,
    request: Request
) -> WidgetLeadResponse:
    """
    Save lead capture data from the widget.
    """
    conversation = None
    async with get_db_session() as session:
        result = await session.execute(
            select(Conversation).where(Conversation.id == request_data.conversation_id)
        )
        conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    await validate_domain(request, conversation.chatbot_id)
    
    try:
        lead_id = f"lead_{int(datetime.utcnow().timestamp() * 1000)}"
        async with get_db_session() as session:
            lead = Lead(
                id=lead_id,
                tenant_id=conversation.tenant_id,
                conversation_id=conversation.id,
                name=request_data.lead_data.name,
                email=request_data.lead_data.email,
                phone=request_data.lead_data.phone,
                company=request_data.lead_data.company,
                source_channel="web",
                status="new",
                created_at=datetime.utcnow()
            )
            session.add(lead)
            await session.commit()
        
        return WidgetLeadResponse(
            success=True,
            message="Lead captured successfully"
        )
    except Exception as e:
        logger.error(f"Error saving lead: {str(e)}", exc_info=True)
        return WidgetLeadResponse(
            success=False,
            message="Failed to capture lead"
        )


@router.post("/widget/feedback", response_model=WidgetFeedbackResponse)
async def widget_feedback(
    request_data: WidgetFeedbackRequest,
    request: Request
) -> WidgetFeedbackResponse:
    """
    Save feedback from the widget (thumbs up/down).
    """
    conversation = None
    async with get_db_session() as session:
        result = await session.execute(
            select(Conversation).where(Conversation.id == request_data.conversation_id)
        )
        conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    await validate_domain(request, conversation.chatbot_id)
    
    try:
        rating_value = "positive" if request_data.rating == "positive" else "negative"
        async with get_db_session() as session:
            conversation.rating = rating_value
            await session.commit()
        
        return WidgetFeedbackResponse(
            success=True,
            message="Feedback saved successfully"
        )
    except Exception as e:
        logger.error(f"Error saving feedback: {str(e)}", exc_info=True)
        return WidgetFeedbackResponse(
            success=False,
            message="Failed to save feedback"
        )
