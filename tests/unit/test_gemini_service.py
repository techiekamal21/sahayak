"""Unit tests for Gemini service — schema validation and response parsing.

Gemini is mocked — no actual API calls in unit tests.
Tests validate JSON parsing, schema conformance, and error handling.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.incident import EmergencyAnalysis, TriageLevel
from app.models.patient import PatientProfile
from app.services.reasoning.gemini import GeminiReasoningService


class MockGeminiResponse:
    """Simulates a Vertex AI GenerateContentResponse."""

    def __init__(self, data: dict) -> None:
        self.text = json.dumps(data)
        self.candidates = [MagicMock()]


@pytest.fixture
def gemini_service() -> GeminiReasoningService:
    """GeminiReasoningService with mocked Vertex AI init."""
    with patch("vertexai.init"), patch(
        "app.services.reasoning.gemini.GeminiReasoningService._get_model"
    ):
        return GeminiReasoningService(project="test-project")


class TestGeminiResponseParsing:
    """Tests that Gemini response JSON is correctly parsed into EmergencyAnalysis."""

    @pytest.mark.asyncio
    async def test_valid_critical_response_parses_correctly(
        self,
        gemini_service: GeminiReasoningService,
        sample_patient: PatientProfile,
        sample_emergency_analysis: EmergencyAnalysis,
    ) -> None:
        """Valid Gemini JSON response should parse into EmergencyAnalysis."""
        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(
            return_value=MockGeminiResponse(sample_emergency_analysis.model_dump())
        )
        gemini_service._get_model = MagicMock(return_value=mock_model)

        result = await gemini_service.analyze_emergency(
            patient=sample_patient,
            transcript="Seene mein bahut dard ho raha hai",
        )

        assert isinstance(result, EmergencyAnalysis)
        assert result.triage_level in list(TriageLevel)
        assert 0.0 <= result.confidence <= 1.0
        assert len(result.caregiver_steps) >= 1

    @pytest.mark.asyncio
    async def test_safety_validator_applied_to_low_confidence(
        self,
        gemini_service: GeminiReasoningService,
        sample_patient: PatientProfile,
        low_confidence_analysis: EmergencyAnalysis,
    ) -> None:
        """Low confidence response should be escalated by safety validator."""
        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(
            return_value=MockGeminiResponse(low_confidence_analysis.model_dump())
        )
        gemini_service._get_model = MagicMock(return_value=mock_model)

        result = await gemini_service.analyze_emergency(
            patient=sample_patient,
            transcript="test",
        )

        # Safety validator must escalate
        assert result.triage_level == TriageLevel.CALL_108_IMMEDIATELY
        assert "108" in result.caregiver_steps[0].instruction

    @pytest.mark.asyncio
    async def test_confidence_is_within_valid_range(
        self,
        gemini_service: GeminiReasoningService,
        sample_patient: PatientProfile,
        sample_emergency_analysis: EmergencyAnalysis,
    ) -> None:
        """Confidence must always be 0.0 to 1.0."""
        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(
            return_value=MockGeminiResponse(sample_emergency_analysis.model_dump())
        )
        gemini_service._get_model = MagicMock(return_value=mock_model)

        result = await gemini_service.analyze_emergency(
            patient=sample_patient, transcript="test"
        )

        assert 0.0 <= result.confidence <= 1.0

    @pytest.mark.asyncio
    async def test_steps_are_in_priority_order(
        self,
        gemini_service: GeminiReasoningService,
        sample_patient: PatientProfile,
        sample_emergency_analysis: EmergencyAnalysis,
    ) -> None:
        """caregiver_steps must be in ascending priority order."""
        mock_model = AsyncMock()
        mock_model.generate_content_async = AsyncMock(
            return_value=MockGeminiResponse(sample_emergency_analysis.model_dump())
        )
        gemini_service._get_model = MagicMock(return_value=mock_model)

        result = await gemini_service.analyze_emergency(
            patient=sample_patient, transcript="test"
        )

        priorities = [s.priority for s in result.caregiver_steps]
        assert priorities == sorted(priorities)


class TestGeminiPromptBuilding:
    """Tests that prompts are correctly built from patient profiles."""

    def test_patient_profile_injected_in_system_prompt(
        self, sample_patient: PatientProfile
    ) -> None:
        from app.services.reasoning.prompts import build_system_prompt

        prompt = build_system_prompt(sample_patient)
        assert "Ramesh Kumar" in prompt
        assert "Metoprolol" in prompt
        assert "Penicillin" in prompt  # Allergy must be included

    def test_caregiver_id_not_in_system_prompt(
        self, sample_patient: PatientProfile
    ) -> None:
        """caregiver_id must be scrubbed — PII protection."""
        from app.services.reasoning.prompts import build_system_prompt

        prompt = build_system_prompt(sample_patient)
        assert sample_patient.caregiver_id not in prompt

    def test_user_message_includes_transcript(self) -> None:
        from app.services.reasoning.prompts import build_emergency_user_message

        msg = build_emergency_user_message(
            transcript="Seene mein dard ho raha hai",
            ocr_text=None,
            vitals=None,
        )
        assert "Seene mein dard" in msg

    def test_user_message_includes_all_modalities(self) -> None:
        from app.services.reasoning.prompts import build_emergency_user_message

        msg = build_emergency_user_message(
            transcript="chest pain",
            ocr_text="Tab Metoprolol 25mg BD",
            vitals={"heart_rate_bpm": 110, "spo2_percent": 94},
        )
        assert "chest pain" in msg
        assert "Metoprolol" in msg
        assert "110" in msg
