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


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS so the Vite frontend can call this API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(settings.frontend_origin)],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

