"""Shared test fixtures and mock configurations.

ALL tests that touch Gemini, Firebase, Firestore, or Cloud services
use mocks defined here. No GCP credentials are needed for unit tests.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.incident import ActionStep, DrugFlag, EmergencyAnalysis, TriageLevel
from app.models.patient import (
    Allergy,
    AllergyType,
    AllergySeverity,
    Condition,
    Medication,
    PatientProfile,
    Vitals,
)

# ── Sample Data Fixtures ───────────────────────────────────────────────────────


@pytest.fixture
def sample_patient() -> PatientProfile:
    """A realistic patient profile for use across all tests."""
    return PatientProfile(
        patient_id="test-patient-001",
        caregiver_id="test-caregiver-uid",
        name="Ramesh Kumar",
        age_years=72,
        gender="male",
        preferred_language="hi",
        conditions=[
            Condition(name="Hypertension", icd_code="I10", is_chronic=True),
            Condition(name="Type 2 Diabetes Mellitus", icd_code="E11", is_chronic=True),
            Condition(name="Coronary Artery Disease", icd_code="I25.1", is_chronic=True),
        ],
        medications=[
            Medication(name="Metoprolol", dosage="25mg", frequency="twice daily", is_active=True),
            Medication(name="Metformin", dosage="500mg", frequency="twice daily", is_active=True),
            Medication(name="Aspirin", dosage="75mg", frequency="once daily", is_active=True),
            Medication(name="Atorvastatin", dosage="20mg", frequency="at night", is_active=True),
        ],
        allergies=[
            Allergy(
                substance="Penicillin",
                allergy_type=AllergyType.DRUG,
                severity=AllergySeverity.SEVERE,
                reaction_description="Anaphylaxis",
                confirmed=True,
            )
        ],
        incident_count=3,
    )


@pytest.fixture
def sample_emergency_analysis() -> EmergencyAnalysis:
    """A realistic emergency analysis response for testing validators."""
    return EmergencyAnalysis(
        detected_language="hi",
        triage_level=TriageLevel.CRITICAL,
        primary_concern="Suspected acute myocardial infarction",
        confidence=0.88,
        patient_summary="72M with CAD, HTN, T2DM on aspirin, metoprolol, metformin, atorvastatin",
        chief_complaint="Chest pain radiating to left arm, diaphoresis, onset 20 mins ago",
        drug_flags=[
            DrugFlag(
                drug_name="Aspirin",
                flag_type="INFO",
                explanation="Patient is already on daily aspirin 75mg. Do not give additional aspirin.",
            )
        ],
        caregiver_steps=[
            ActionStep(
                priority=1,
                instruction="Call 108 immediately. Tell them: 'My elderly relative has severe chest pain.' Stay on the line.",
                rationale="CRITICAL triage — ambulance required immediately.",
            ),
            ActionStep(
                priority=2,
                instruction="Help Ramesh sit upright — help him lean forward slightly if that helps him breathe.",
                caution="Do not lie him flat.",
                rationale="Upright position reduces cardiac workload and aids breathing in suspected MI.",
            ),
            ActionStep(
                priority=3,
                instruction="Do NOT give any additional aspirin or medication — he is already on aspirin.",
                caution="Do not double his aspirin dose.",
                rationale="Patient already on daily aspirin 75mg — additional dose not indicated.",
            ),
        ],
        hospital_brief=(
            "72M known CAD, HTN, T2DM. Active medications: metoprolol 25mg BD, "
            "metformin 500mg BD, aspirin 75mg OD, atorvastatin 20mg ON. "
            "ALLERGY: Penicillin (anaphylaxis). "
            "Presenting with acute chest pain radiating to left arm with diaphoresis x 20min. "
            "Suspected STEMI. Ambulance dispatched."
        ),
        fhir_trigger=True,
    )


@pytest.fixture
def low_confidence_analysis(sample_emergency_analysis: EmergencyAnalysis) -> EmergencyAnalysis:
    """Analysis with confidence below the 0.70 threshold."""
    analysis = sample_emergency_analysis.model_copy(deep=True)
    analysis.confidence = 0.45
    analysis.triage_level = TriageLevel.MODERATE
    analysis.fhir_trigger = False
    return analysis


@pytest.fixture
def blocked_phrase_analysis(sample_emergency_analysis: EmergencyAnalysis) -> EmergencyAnalysis:
    """Analysis containing a dangerous blocked phrase in caregiver steps."""
    analysis = sample_emergency_analysis.model_copy(deep=True)
    analysis.triage_level = TriageLevel.MODERATE
    analysis.confidence = 0.85
    analysis.caregiver_steps = [
        ActionStep(
            priority=1,
            instruction="Give aspirin immediately — crush one tablet and put under his tongue.",
            rationale="Attempting aspirin recommendation — should be BLOCKED.",
        )
    ]
    return analysis


@pytest.fixture
def stable_analysis() -> EmergencyAnalysis:
    """A stable, low-risk analysis for normal case tests."""
    return EmergencyAnalysis(
        detected_language="en",
        triage_level=TriageLevel.STABLE,
        primary_concern="Mild blood pressure elevation — monitor",
        confidence=0.91,
        patient_summary="72M with known HTN, usual BP slightly elevated",
        chief_complaint="Mild headache, BP recorded as 150/95",
        drug_flags=[],
        caregiver_steps=[
            ActionStep(
                priority=1,
                instruction="Have Ramesh rest quietly in a comfortable chair for 30 minutes.",
                rationale="Rest reduces blood pressure in isolated hypertensive reading.",
            ),
            ActionStep(
                priority=2,
                instruction="Measure blood pressure again after 30 minutes of rest. If still above 160/100, call the doctor.",
                rationale="Monitoring for sustained hypertension.",
            ),
        ],
        hospital_brief="72M HTN. Isolated elevated BP reading 150/95. Monitoring under caregiver supervision.",
        fhir_trigger=False,
    )


# ── Mock Fixtures ─────────────────────────────────────────────────────────────


@pytest.fixture
def mock_gemini_service() -> MagicMock:
    """Mock GeminiReasoningService — no Vertex AI calls in unit tests."""
    mock = MagicMock()
    mock.analyze_emergency = AsyncMock()
    mock.extract_profile_data = AsyncMock(return_value={})
    return mock


@pytest.fixture
def mock_firestore():
    """Mock Firestore AsyncClient."""
    with patch("google.cloud.firestore.AsyncClient") as mock:
        yield mock


@pytest.fixture
def mock_firebase_auth():
    """Mock Firebase auth.verify_id_token to return a valid decoded token."""
    with patch("firebase_admin.auth.verify_id_token") as mock:
        mock.return_value = {"uid": "test-caregiver-uid", "phone_number": "+91 9876543210"}
        yield mock
