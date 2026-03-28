"""Pydantic v2 data models for emergency incident analysis.

These are the output models from Gemini's reasoning layer.
All output from Gemini is validated against these schemas
BEFORE any action is taken (safety gate).
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class TriageLevel(str, Enum):
    """Clinical triage classification.

    Each level maps to a specific response protocol:
    - CRITICAL: Send FHIR brief to hospital, call 108 immediately
    - URGENT: See doctor within 2 hours
    - MODERATE: GP visit today
    - STABLE: Routine management, monitor
    - CALL_108: Uncertainty-triggered safety fallback
    """

    CRITICAL = "CRITICAL"
    URGENT = "URGENT"
    MODERATE = "MODERATE"
    STABLE = "STABLE"
    CALL_108_IMMEDIATELY = "CALL_108"


class ActionStep(BaseModel):
    """Single step in the caregiver guidance sequence."""
    priority: int
    instruction: str
    caution: Optional[str] = None
    rationale: str

class DrugFlag(BaseModel):
    """Drug interaction or contraindication flag."""
    drug_name: str
    flag_type: str
    explanation: str

class EmergencyAnalysis(BaseModel):
    """Structured output from a single Gemini emergency reasoning call."""
    detected_language: str
    english_translation: Optional[str] = None
    triage_level: TriageLevel
    primary_concern: str
    confidence: float
    patient_summary: str
    chief_complaint: str
    drug_flags: list[DrugFlag] = []
    caregiver_steps: list[ActionStep]
    hospital_brief: str
    fhir_trigger: bool
    incident_id: Optional[str] = None
    analyzed_at: datetime = datetime.utcnow()

class EmergencyRequest(BaseModel):
    """HTTP request model for POST /emergency/analyze."""
    patient_id: str
    transcript: Optional[str] = None
    ocr_text: Optional[str] = None
    vitals_json: Optional[dict] = None
    image_base64: Optional[str] = None
    source_language: Optional[str] = None

    def has_any_input(self) -> bool:
        return any([self.transcript, self.ocr_text, self.vitals_json, self.image_base64])

class EmergencyResponse(BaseModel):
    """HTTP response model for POST /emergency/analyze."""
    incident_id: str
    triage_level: TriageLevel
    primary_concern: str
    english_translation: Optional[str] = None
    caregiver_steps: list[ActionStep]
    drug_flags: list[DrugFlag]
    hospital_notified: bool
    detected_language: str
    response_language: str
    analyzed_at: datetime

class IncidentSummary(BaseModel):
    """Lightweight incident summary for history listing."""
    incident_id: str
    patient_id: str
    triage_level: TriageLevel
    primary_concern: str
    analyzed_at: datetime
    hospital_notified: bool
