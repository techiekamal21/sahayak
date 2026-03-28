"""Gemini 1.5 Pro reasoning service — core intelligence layer using google-genai.

This is the single entry point for all AI reasoning in SAHAYAK.
ALL inputs (voice, OCR, vitals) are fused into ONE Gemini call.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.models.incident import EmergencyAnalysis
from app.models.patient import PatientProfile
from app.services.reasoning.prompts import (
    build_emergency_user_message,
    build_system_prompt,
)
from app.services.reasoning.safety import SafetyValidator

logger = logging.getLogger(__name__)


class GeminiReasoningService:
    """Single-responsibility: fuse all emergency inputs → structured analysis."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-1.5-pro",
        temperature: float = 0.1,
        max_output_tokens: int = 2048,
        confidence_threshold: float = 0.70,
    ) -> None:
        if not api_key:
            api_key = get_settings().gemini_api_key
        
        self.client = genai.Client(api_key=api_key)
        self._model_name = model
        self._temperature = temperature
        self._max_output_tokens = max_output_tokens
        self.validator = SafetyValidator(confidence_threshold=confidence_threshold)
        logger.info("GeminiReasoningService initialized: google-genai SDK, model=%s", model)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def analyze_emergency(
        self,
        patient: PatientProfile,
        transcript: Optional[str] = None,
        ocr_text: Optional[str] = None,
        vitals: Optional[dict] = None,
    ) -> EmergencyAnalysis:
        """Fuse all inputs → validated EmergencyAnalysis."""
        system_prompt = build_system_prompt(patient)
        user_message = build_emergency_user_message(transcript, ocr_text, vitals)

        logger.info(
            "Gemini call — patient=%s, has_transcript=%s, has_ocr=%s, has_vitals=%s",
            patient.patient_id,
            transcript is not None,
            ocr_text is not None,
            vitals is not None,
        )

        response = self.client.models.generate_content(
            model=self._model_name,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=EmergencyAnalysis.model_json_schema(),
                temperature=self._temperature,
                max_output_tokens=self._max_output_tokens,
            )
        )

        raw_json = response.text
        logger.debug("Gemini raw response length: %d chars", len(raw_json))

        # Parse and validate against Pydantic schema
        raw_dict = json.loads(raw_json)
        analysis = EmergencyAnalysis.model_validate(raw_dict)

        # Safety gate — NEVER skip this
        analysis = self.validator.validate(analysis)

        logger.info(
            "Emergency analysis complete — triage=%s, confidence=%.2f, fhir_trigger=%s",
            analysis.triage_level,
            analysis.confidence,
            analysis.fhir_trigger,
        )

        return analysis

    async def extract_profile_data(
        self,
        raw_text: str,
    ) -> dict:
        """Extract structured patient data from unstructured text."""
        from app.services.reasoning.prompts import PROFILE_EXTRACTION_TEMPLATE

        prompt = PROFILE_EXTRACTION_TEMPLATE.format(raw_text=raw_text)

        response = self.client.models.generate_content(
            model=self._model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0,
                max_output_tokens=1024,
            )
        )

        return json.loads(response.text)
