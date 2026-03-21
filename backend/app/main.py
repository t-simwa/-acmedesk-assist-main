"""
FastAPI application entrypoint for the AcmeDesk Assist backend.

This module defines:
- The FastAPI app instance.
- CORS configuration to allow the Vite frontend origin.
- A simple root `/` route returning JSON for quick smoke testing.
- Database initialization on startup.
"""

import logging
import re
import time
from contextlib import asynccontextmanager

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging so all API activity and app logs appear in the terminal (debugging).
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
    force=True,
)
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
for handler in root_logger.handlers:
    handler.setLevel(logging.INFO)

# Keep uvicorn access logs visible.
logging.getLogger("uvicorn.access").setLevel(logging.INFO)
logging.getLogger("uvicorn.error").setLevel(logging.INFO)
logging.getLogger("uvicorn").setLevel(logging.INFO)
logging.getLogger("httpx").setLevel(logging.INFO)
logging.getLogger("httpcore").setLevel(logging.INFO)
logging.getLogger("openai").setLevel(logging.INFO)
logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)

logger = logging.getLogger(__name__)

from .config import settings
from .models.base import close_db, get_database_url, init_db
from .routers import (
    admin,
    analytics,
    auth,
    billing,
    chat,
    chatbot,
    conversations,
    dashboard,
    documents,
    email,
    health,
    knowledge_bases,
    leads,
    settings as settings_router,
    sms,
    user_preferences,
    whatsapp,
    messenger,
    instagram,
    security,
    oauth,
    team,
    onboarding,
    contacts,
    campaigns,
    bookings,
    services,
    channels,
    inbox,
    notifications,
    super_admin,
    email_unsubscribe,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup: Initialize database
    await init_db()
    db_url = get_database_url()
    if "sqlite" in db_url:
        # Log path so we can confirm which file is used (e.g. after deleting acmedesk.db)
        db_path = db_url.replace("sqlite+aiosqlite:///", "")
        logger.info("Database: %s", db_path)
    # Log RAG vector store path and collection size so we can confirm it matches ingestion
    try:
        from app.config import get_vector_store_persist_dir, get_settings
        persist_dir = get_vector_store_persist_dir()
        rag_settings = get_settings()
        from app.rag.vector_store import VectorStore
        vs = VectorStore(collection_name=rag_settings.vector_collection_name, persist_directory=persist_dir)
        count = vs.collection.count()
        import logging
        logging.getLogger(__name__).info("RAG vector store: %s (collection %s has %d chunks)", persist_dir, rag_settings.vector_collection_name, count)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("RAG vector store check at startup: %s", e)
    # Start token refresh scheduler if enabled
    try:
        if settings.token_refresh_enabled:
            from .services.token_refresh_scheduler import start_scheduler

            start_scheduler()
    except Exception as e:
        logger.warning("Failed to start token refresh scheduler: %s", e)

    # Start booking reminder scheduler if enabled
    try:
        if settings.booking_reminder_scheduler_enabled:
            from .services.booking_reminder_scheduler import start_scheduler as start_booking_reminder_scheduler

            start_booking_reminder_scheduler()
    except Exception as e:
        logger.warning("Failed to start booking reminder scheduler: %s", e)

    yield
    # Shutdown: Close database connections
    # Stop token refresh scheduler if running
    try:
        from .services.token_refresh_scheduler import shutdown_scheduler

        shutdown_scheduler()
    except Exception:
        pass

    # Stop booking reminder scheduler if running
    try:
        from .services.booking_reminder_scheduler import shutdown_scheduler as shutdown_booking_reminder_scheduler

        shutdown_booking_reminder_scheduler()
    except Exception:
        pass

    await close_db()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Configure CORS so the frontend can call this API.
# Explicitly list dev origins so browser always receives Access-Control-Allow-Origin.
allowed_origins = [
    str(settings.frontend_origin),
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
]
# Deduplicate while preserving order
allowed_origins = list(dict.fromkeys(allowed_origins))
# Allow any other localhost port via regex
allow_origin_regex = r"http://(localhost|127\.0\.0\.1)(:\d+)?"

# Regex to allow localhost / 127.0.0.1 with any port (for CORS fallback)
_LOCALHOST_ORIGIN_REGEX = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", re.I)


class EnsureCorsHeadersMiddleware(BaseHTTPMiddleware):
    """Ensure CORS headers are present on every response so browser never blocks on missing header."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        origin = request.headers.get("origin")
        if not origin:
            return response
        if _LOCALHOST_ORIGIN_REGEX.match(origin):
            if "access-control-allow-origin" not in response.headers:
                response.headers["access-control-allow-origin"] = origin
                response.headers["access-control-allow-credentials"] = "true"
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log every request and response to the terminal for debugging."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        method = request.method
        path = request.url.path
        query = request.url.query
        client = request.client.host if request.client else "?"
        if query:
            path = f"{path}?{query}"

        access_logger = logging.getLogger("uvicorn.access")
        access_logger.info("--> %s %s (client=%s)", method, path, client)
        print(f"--> {method} {path} (client={client})")

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000
        access_logger.info("<-- %s %s %s %.0fms", method, path, response.status_code, duration_ms)
        print(f"<-- {method} {path} {response.status_code} {duration_ms:.0f}ms")

        return response


# Add CORSMiddleware first (inner); then EnsureCorsHeadersMiddleware; then RequestLoggingMiddleware (outermost)
# so the fallback runs last on response and adds CORS header if missing (e.g. on 500).
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)
app.add_middleware(EnsureCorsHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Register API routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(chatbot.router)
app.include_router(conversations.router)
app.include_router(leads.router)
app.include_router(documents.router)
app.include_router(settings_router.router)
app.include_router(analytics.router)
app.include_router(user_preferences.router)
app.include_router(admin.router)
app.include_router(super_admin.router)
app.include_router(knowledge_bases.router)
app.include_router(email.router)
app.include_router(sms.router)
app.include_router(whatsapp.router)
app.include_router(messenger.router)
app.include_router(instagram.router)
# Meta OAuth endpoints (handles Facebook/Instagram/WhatsApp OAuth exchanges)
from .routers import meta_oauth
app.include_router(meta_oauth.router)
# Channel configuration helpers
from .routers import channel_config
app.include_router(channel_config.router)
# Channel settings endpoints (behavior, appearance, profiles)
from .routers import channel_settings
from .routers import test_stream
app.include_router(channel_settings.router)
app.include_router(test_stream.router)
# WhatsApp templates management
from .routers import whatsapp_templates
app.include_router(whatsapp_templates.router)
app.include_router(billing.router)
app.include_router(security.router)
app.include_router(oauth.router)
app.include_router(team.router)
app.include_router(onboarding.router)
app.include_router(dashboard.router)
app.include_router(contacts.router)
app.include_router(campaigns.router)
app.include_router(bookings.router)
app.include_router(services.router)
app.include_router(channels.router)
app.include_router(inbox.router)
app.include_router(notifications.router)
app.include_router(email_unsubscribe.router)

# Webhook endpoints for receiving inbound messages
from .routers.webhooks import whatsapp_webhook, messenger_webhook, instagram_webhook, sms_webhook
app.include_router(whatsapp_webhook.router)
app.include_router(messenger_webhook.router)
app.include_router(instagram_webhook.router)
app.include_router(sms_webhook.router)


@app.get("/")
async def read_root() -> dict:
    """
    Simple health-style root endpoint.

    Returns static JSON that can be used to confirm the backend is running.
    """

    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
    }


@app.get("/api/debug-dashboard")
async def debug_dashboard():
    """Debug endpoint to test dashboard queries."""
    from datetime import datetime, timedelta
    from app.models.base import get_session_factory
    from sqlalchemy import select, func
    from app.models.conversation import Conversation
    from app.services.database import _effective_tenant_ids
    
    tenant_id = '330fd2b0-6b5f-41a8-ba6d-ad7355fe4c9d'
    user_id = '066529cd-f5e2-42df-8595-350178c5fc48'
    
    tenant_ids = _effective_tenant_ids(tenant_id, user_id)
    
    end = datetime.utcnow()
    start = end - timedelta(days=7)
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(func.count(Conversation.id))
            .where(
                Conversation.tenant_id.in_(tenant_ids),
                Conversation.started_at >= start,
                Conversation.started_at <= end
            )
        )
        count = result.scalar()
        
        # Also get total without date filter
        result2 = await session.execute(
            select(func.count(Conversation.id))
            .where(Conversation.tenant_id.in_(tenant_ids))
        )
        total = result2.scalar()
    
    # Run the same database queries used by the dashboard summary, step-by-step,
    # returning the first failing call for easier debugging.
    from app.services import database as db

    try:
        conv_count = await db.get_conversations_count_by_date_range(tenant_ids[0], start, end, user_id=user_id)
    except Exception as e:
        return {"failed": "get_conversations_count_by_date_range", "error": str(e)}

    try:
        leads_count = await db.get_leads_count_by_date_range(tenant_ids[0], start, end, user_id=user_id)
    except Exception as e:
        return {"failed": "get_leads_count_by_date_range", "error": str(e)}

    try:
        resolution = await db.get_resolution_rate_by_date_range(tenant_ids[0], start, end, user_id=user_id)
    except Exception as e:
        return {"failed": "get_resolution_rate_by_date_range", "error": str(e)}

    try:
        volume = await db.get_conversations_by_date_range(tenant_ids[0], start, end, user_id=user_id)
    except Exception as e:
        return {"failed": "get_conversations_by_date_range", "error": str(e)}

    try:
        outcomes = await db.get_conversation_outcomes(tenant_ids[0], start, end, user_id=user_id)
    except Exception as e:
        return {"failed": "get_conversation_outcomes", "error": str(e)}

    try:
        channels = await db.get_conversations_by_channel(tenant_ids[0], start, end, user_id=user_id)
    except Exception as e:
        return {"failed": "get_conversations_by_channel", "error": str(e)}

    try:
        recent_convs = await db.get_recent_conversations(tenant_ids[0], limit=5, user_id=user_id)
    except Exception as e:
        return {"failed": "get_recent_conversations", "error": str(e)}

    try:
        recent_leads = await db.get_recent_leads(tenant_ids[0], limit=5, user_id=user_id)
    except Exception as e:
        return {"failed": "get_recent_leads", "error": str(e)}

    try:
        unanswered = await db.get_unanswered_questions_count(tenant_ids[0], start, end, user_id=user_id)
    except Exception as e:
        return {"failed": "get_unanswered_questions_count", "error": str(e)}

    try:
        chatbot = await db.get_chatbot_status(tenant_ids[0])
    except Exception as e:
        return {"failed": "get_chatbot_status", "error": str(e)}

    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "tenant_ids_used": tenant_ids,
        "date_range": f"{start} to {end}",
        "conversations_count": conv_count,
        "leads_count": leads_count,
        "resolution_rate": resolution,
        "volume_sample": volume[:3],
        "outcomes": outcomes,
        "channels": channels,
        "recent_conversations_sample": recent_convs,
        "recent_leads_sample": recent_leads,
        "unanswered_count": unanswered,
        "chatbot": chatbot,
    }
