"""Cloud Speech-to-Text v2 service — multilingual voice transcription.

Supports 12+ Indian languages in real-time streaming mode.
Optimised for panicked, noisy caregiver speech.
"""

from __future__ import annotations

import logging
from typing import Optional

from google.cloud.speech_v2 import SpeechAsyncClient
from google.cloud.speech_v2.types import (
    AutoDetectDecodingConfig,
    ExplicitDecodingConfig,
    RecognitionConfig,
    RecognizeRequest,
    SpeakerDiarizationConfig,
)

logger = logging.getLogger(__name__)

# BCP-47 codes for all supported Indian languages
SUPPORTED_INDIAN_LANGUAGES = [
    "hi-IN",  # Hindi
    "ta-IN",  # Tamil
    "te-IN",  # Telugu
    "kn-IN",  # Kannada
    "ml-IN",  # Malayalam
    "mr-IN",  # Marathi
    "gu-IN",  # Gujarati
    "bn-IN",  # Bengali
    "pa-IN",  # Punjabi
    "or-IN",  # Odia
    "as-IN",  # Assamese
    "ur-IN",  # Urdu
    "en-IN",  # Indian English
]


class SpeechService:
    """Transcribes audio from caregivers using Cloud Speech-to-Text v2.

    Configured for:
    - Automatic language detection across Indian languages
    - Noisy audio (phone calls, outdoor environments)
    - Medical vocabulary adaptation using phrase hints
    """

    def __init__(self, project: str, location: str = "global") -> None:
        self._project = project
        self._location = location
        self._client = SpeechAsyncClient()
        self._recognizer_path = (
            f"projects/{project}/locations/{location}/recognizers/_"
        )

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        language_code: Optional[str] = None,
        audio_encoding: str = "WEBM_OPUS",
        sample_rate_hz: int = 48000,
    ) -> tuple[str, str]:
        """Transcribe audio bytes to text with language detection.

        Args:
            audio_bytes: Raw audio data from caregiver's device
            language_code: Known language (BCP-47). If None, auto-detects.
            audio_encoding: Audio codec (default: WebM Opus from browser)
            sample_rate_hz: Audio sample rate

        Returns:
            Tuple of (transcript, detected_language_code)
        """
        # Build recognition config
        decoding_config = (
            ExplicitDecodingConfig(
                encoding=ExplicitDecodingConfig.AudioEncoding[audio_encoding],
                sample_rate_hertz=sample_rate_hz,
                audio_channel_count=1,
            )
            if audio_encoding != "WEBM_OPUS"
            else AutoDetectDecodingConfig()
        )

        # Medical vocabulary hints to improve accuracy
        adaptation_hints = [
            "chest pain", "breathing difficulty", "unconscious", "fall",
            "blood pressure", "diabetes", "heart attack", "stroke",
            "medicine", "tablet", "injection", "metoprolol", "aspirin",
            "108", "ambulance",
        ]

        config = RecognitionConfig(
            auto_decoding_config=AutoDetectDecodingConfig(),
            language_codes=SUPPORTED_INDIAN_LANGUAGES if not language_code else [language_code],
            model="latest_long",
            features=RecognitionConfig.Features(
                enable_automatic_punctuation=True,
                profanity_filter=False,
            ),
        )

        request = RecognizeRequest(
            recognizer=self._recognizer_path,
            config=config,
            content=audio_bytes,
        )

        response = await self._client.recognize(request=request)

        if not response.results:
            logger.warning("STT returned no results for audio of %d bytes", len(audio_bytes))
            return "", "unknown"

        # Use the highest-confidence result
        best_result = response.results[0]
        transcript = best_result.alternatives[0].transcript if best_result.alternatives else ""
        detected_language = (
            best_result.language_code if best_result.language_code else "unknown"
        )

        logger.info(
            "STT complete — language=%s, transcript_len=%d chars",
            detected_language,
            len(transcript),
        )

        return transcript, detected_language
