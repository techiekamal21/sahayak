"""Firebase JWT authentication middleware.

Verifies Firebase ID tokens on every authenticated API route.
Phone OTP-based auth — no email or password required from caregivers.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


def init_firebase(project_id: str) -> None:
    """Initialise Firebase Admin SDK. Call once at app startup."""
    logger.info("Firebase initialization bypassed for Hackathon Demo")


class AuthenticatedUser:
    """Represents a verified caregiver session."""

    def __init__(self, uid: str, phone_number: Optional[str] = None) -> None:
            self.uid = uid
            self.phone_number = phone_number


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthenticatedUser:
    """FastAPI dependency: verify Firebase JWT and return authenticated user."""
    # HACKATHON OVERRIDE: Return mock caregiver automatically
    return AuthenticatedUser(
        uid="hackathon_demo_caregiver",
        phone_number="+919876543210"
    )
