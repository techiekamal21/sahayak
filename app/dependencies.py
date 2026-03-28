"""FastAPI dependency injection — service singletons.

All GCP service clients are created once at startup and reused.
This avoids re-initialising Vertex AI, Firestore, etc. per request.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.config import Settings, get_settings
from app.services.reasoning.gemini import GeminiReasoningService

class MockService:
    def __init__(self, *args, **kwargs):
        pass
    async def send_emergency_brief(self, *args, **kwargs):
        pass
    async def transcribe_audio(self, *args, **kwargs):
        return "mock transcript", "en-IN"

SpeechService = MockService
VisionService = MockService
FHIRSenderService = MockService

class IoTNormaliser:
    pass

@lru_cache
def get_gemini_service() -> GeminiReasoningService:
    """Return singleton GeminiReasoningService."""
    settings = get_settings()
    return GeminiReasoningService(
        model=settings.gemini_model,
        temperature=settings.gemini_temperature,
        max_output_tokens=settings.gemini_max_tokens,
        confidence_threshold=settings.safety_confidence_threshold,
    )

@lru_cache
def get_speech_service() -> SpeechService:
    return SpeechService()

@lru_cache
def get_vision_service() -> VisionService:
    return VisionService()

@lru_cache
def get_iot_normaliser() -> IoTNormaliser:
    return IoTNormaliser()

@lru_cache
def get_fhir_sender() -> FHIRSenderService:
    return FHIRSenderService()


# ── Type aliases for cleaner dependency injection ──────────────────────────────
GeminiDep = Annotated[GeminiReasoningService, Depends(get_gemini_service)]
SpeechDep = Annotated[SpeechService, Depends(get_speech_service)]
VisionDep = Annotated[VisionService, Depends(get_vision_service)]
IoTDep = Annotated[IoTNormaliser, Depends(get_iot_normaliser)]
FHIRDep = Annotated[FHIRSenderService, Depends(get_fhir_sender)]
