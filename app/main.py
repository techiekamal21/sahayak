"""SAHAYAK FastAPI application factory.

Registers all routers, middleware, and startup/shutdown handlers.
Entry point: uvicorn app.main:app
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.middleware.auth import init_firebase
from app.middleware.logging import RequestLoggingMiddleware, configure_logging
from app.routers import emergency, history, profile

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI app."""
    settings = get_settings()

    configure_logging(settings.log_level)

    app = FastAPI(
        title="SAHAYAK — AI Caregiver Co-pilot",
        description=(
            "Emergency medical response AI for informal caregivers in India. "
            "Accepts voice, prescription photos, and IoT vitals. "
            "Returns personalised guidance and notifies hospitals via FHIR R4."
        ),
        version=settings.app_version,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    # ── Middleware ────────────────────────────────────────────────────────────
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Hackathon: Allow everywhere
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(emergency.router, prefix="/api/v1")
    app.include_router(profile.router, prefix="/api/v1")
    app.include_router(history.router, prefix="/api/v1")

    # ── Static Files (frontend) ───────────────────────────────────────────────
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

    # ── Startup ───────────────────────────────────────────────────────────────
    @app.on_event("startup")
    async def on_startup() -> None:
        """Initialise GCP service connections at startup."""
        logger.info("SAHAYAK starting up — project=%s", settings.google_cloud_project)
        init_firebase(project_id=settings.firebase_project_id or settings.google_cloud_project)
        logger.info("SAHAYAK ready")

    # ── Health Check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["ops"], include_in_schema=False)
    async def health_check() -> dict:
        """Health check endpoint for Cloud Run liveness probe."""
        return {"status": "healthy", "service": "sahayak", "version": settings.app_version}

    return app


# ── Application instance ──────────────────────────────────────────────────────
app = create_app()
