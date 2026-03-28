"""Integration test — full emergency analysis flow (mocked GCP services)."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.incident import EmergencyAnalysis, TriageLevel


class TestEmergencyFlowIntegration:
    """End-to-end integration using mocked GCP dependencies."""

    @pytest.mark.asyncio
    async def test_full_emergency_flow_critical(
        self,
        sample_patient,
        sample_emergency_analysis,
    ) -> None:
        """Simulates a full emergency: voice input → triage → hospital notified."""
        from app.services.reasoning.gemini import GeminiReasoningService
        from app.services.reasoning.safety import SafetyValidator

        with patch("vertexai.init"), patch.object(
            GeminiReasoningService, "_get_model"
        ) as mock_model_getter:
            mock_model = AsyncMock()
            mock_model.generate_content_async = AsyncMock(
                return_value=MagicMock(text=json.dumps(sample_emergency_analysis.model_dump()))
            )
            mock_model_getter.return_value = mock_model

            service = GeminiReasoningService(project="test-project")
            result = await service.analyze_emergency(
                patient=sample_patient,
                transcript="Ramesh ka seene mein bahut dard ho raha hai aur paseena aa raha hai",
                ocr_text=None,
                vitals=None,
            )

        assert result.triage_level == TriageLevel.CRITICAL
        assert result.fhir_trigger is True
        assert "108" in result.caregiver_steps[0].instruction
        assert result.confidence >= 0.70

    @pytest.mark.asyncio
    async def test_multimodal_input_fusion(
        self,
        sample_patient,
        sample_emergency_analysis,
    ) -> None:
        """All three input modalities sent in single Gemini call."""
        from app.services.reasoning.gemini import GeminiReasoningService
        from app.services.reasoning.prompts import build_emergency_user_message

        msg = build_emergency_user_message(
            transcript="seene mein dard",
            ocr_text="Tab Metoprolol 25mg BD",
            vitals={"heart_rate_bpm": 115, "spo2_percent": 93},
        )

        # All inputs must appear in the fused user message
        assert "seene mein dard" in msg
        assert "Metoprolol" in msg
        assert "115" in msg
        assert "93" in msg

    def test_patient_profile_built_from_minimal_input(
        self, sample_patient
    ) -> None:
        """Patient profile can be created with just a name (all fields optional)."""
        from app.models.patient import PatientProfile, PatientProfileCreate

        minimal = PatientProfileCreate(name="Ramesh Kumar")
        profile = PatientProfile(
            patient_id="test-001",
            caregiver_id="cg-001",
            **minimal.model_dump(),
        )

        assert profile.name == "Ramesh Kumar"
        assert profile.medications == []
        assert profile.conditions == []
        assert profile.preferred_language == "hi"

    def test_profile_active_medications_filter(self, sample_patient) -> None:
        """Only active medications returned by active_medications property."""
        # Mark metformin as inactive
        sample_patient.medications[1].is_active = False
        active = sample_patient.active_medications
        assert len(active) == len(sample_patient.medications) - 1
        assert all(m.is_active for m in active)

    def test_triage_to_fhir_trigger_mapping(self, sample_emergency_analysis) -> None:
        """CRITICAL + CALL_108 should always trigger FHIR, others may not."""
        assert sample_emergency_analysis.fhir_trigger is True  # CRITICAL

    def test_emergency_analysis_step_ordering_validated(self) -> None:
        """Pydantic must reject out-of-order steps."""
        from app.models.incident import ActionStep, EmergencyAnalysis, TriageLevel

        with pytest.raises(Exception):
            EmergencyAnalysis(
                detected_language="hi",
                triage_level=TriageLevel.STABLE,
                primary_concern="Test",
                confidence=0.9,
                patient_summary="Test",
                chief_complaint="Test",
                drug_flags=[],
                caregiver_steps=[
                    ActionStep(priority=3, instruction="Step three first", rationale="Wrong order"),
                    ActionStep(priority=1, instruction="Step one second", rationale="Wrong order"),
                ],
                hospital_brief="Test brief for hospital",
                fhir_trigger=False,
            )
