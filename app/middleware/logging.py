"""Structured Cloud Logging middleware for SAHAYAK.

All logs are structured JSON — compatible with Cloud Logging's log explorer.
PII is never logged — patient names and audio content are excluded.
"""

from __future__ import annotations

import logging
import time
import uuid

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


def configure_logging(log_level: str = "INFO") -> None:
    """Configure structlog for structured JSON logging to Cloud Logging."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(log_level.upper())
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log every HTTP request with structured metadata.

    Logged fields: method, path, status_code, duration_ms, request_id.
    PII fields (patient data, audio) are never logged.
    """

    async def dispatch(self, request: Request, call_next: object) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start_time = time.monotonic()

        structlog.contextvars.bind_contextvars(request_id=request_id)

        log = structlog.get_logger()
        log.info(
            "request_started",
            method=request.method,
            path=request.url.path,
        )

        response: Response = await call_next(request)  # type: ignore[arg-type]

        duration_ms = round((time.monotonic() - start_time) * 1000, 1)
        log.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

        response.headers["X-Request-ID"] = request_id
        structlog.contextvars.clear_contextvars()
        return response
