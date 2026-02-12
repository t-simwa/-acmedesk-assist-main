"""
FastAPI application entrypoint for the AcmeDesk Assist backend.

This module defines:
- The FastAPI app instance.
- CORS configuration to allow the Vite frontend origin.
- A simple root `/` route returning JSON for quick smoke testing.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import chat, health


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS so the Vite frontend can call this API during development.
# In development, allow common localhost ports for flexibility
if settings.environment == "development":
    allowed_origins = [
        str(settings.frontend_origin),
        "http://localhost:8080",  # Current Vite dev server port
        "http://localhost:5173",   # Default Vite dev server port
    ]
else:
    allowed_origins = [str(settings.frontend_origin)]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health.router)
app.include_router(chat.router)


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

