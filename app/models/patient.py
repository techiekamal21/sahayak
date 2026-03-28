"""Pydantic v2 data models for patient profile entities.

These models are the single source of truth for patient data structure.
All fields are fully typed. All validators are explicit.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class BloodType(str, Enum):
    """ABO blood group + Rh factor."""

    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"
    UNKNOWN = "Unknown"


class AllergyType(str, Enum):
    """Category of allergy."""

    DRUG = "drug"
    FOOD = "food"
    ENVIRONMENTAL = "environmental"
    OTHER = "other"


class AllergySeverity(str, Enum):
    """Clinical severity of allergic reaction."""

    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"  # Anaphylaxis risk
    UNKNOWN = "unknown"


class Allergy(BaseModel):
    """Single allergy entry — extracted from voice, photo, or structured input."""

    substance: str = Field(min_length=1, max_length=200, description="Allergen name")
    allergy_type: AllergyType = AllergyType.DRUG
    severity: AllergySeverity = AllergySeverity.UNKNOWN
    reaction_description: Optional[str] = Field(default=None, max_length=500)
    confirmed: bool = Field(
        default=False,
        description="True if confirmed by a clinician, False if reported by caregiver",
    )


class Medication(BaseModel):
    """Single medication entry — frequently extracted from prescription photos via OCR."""

    name: str = Field(min_length=1, max_length=200, description="Drug name (generic or brand)")
    dosage: Optional[str] = Field(default=None, max_length=100, description="e.g., '5mg'")
    frequency: Optional[str] = Field(
        default=None, max_length=100, description="e.g., 'twice daily'"
    )
    route: Optional[str] = Field(
        default=None, max_length=50, description="e.g., 'oral', 'inhaled'"
    )
    prescribed_for: Optional[str] = Field(default=None, max_length=300)
    is_active: bool = Field(default=True, description="Currently taking this medication")
    source: str = Field(
        default="caregiver_reported",
        description="How this was captured: 'ocr', 'voice', 'caregiver_reported'",
    )

    @field_validator("name")
    @classmethod
    def normalise_name(cls, v: str) -> str:
        """Ensure consistent casing for drug name lookups."""
        return v.strip().title()


class Condition(BaseModel):
    """Diagnosed medical condition."""

    name: str = Field(min_length=1, max_length=300, description="Condition name")
    icd_code: Optional[str] = Field(default=None, max_length=10, description="ICD-10 code if known")
    diagnosed_date: Optional[str] = Field(default=None, description="YYYY-MM or YYYY")
    is_chronic: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, max_length=500)


class Surgery(BaseModel):
    """Historical surgical procedure."""

    procedure: str = Field(min_length=1, max_length=300)
    date: Optional[str] = Field(default=None, description="YYYY-MM or YYYY")
    hospital: Optional[str] = Field(default=None, max_length=200)
    notes: Optional[str] = Field(default=None, max_length=500)


class Vitals(BaseModel):
    """Latest recorded vital signs — may come from IoT wearable or manual entry."""

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    heart_rate_bpm: Optional[int] = Field(default=None, ge=20, le=300)
    systolic_bp_mmhg: Optional[int] = Field(default=None, ge=50, le=300)
    diastolic_bp_mmhg: Optional[int] = Field(default=None, ge=20, le=200)
    spo2_percent: Optional[float] = Field(default=None, ge=50.0, le=100.0)
    temperature_celsius: Optional[float] = Field(default=None, ge=30.0, le=45.0)
    respiratory_rate_per_min: Optional[int] = Field(default=None, ge=5, le=60)
    glucose_mmol_l: Optional[float] = Field(default=None, ge=1.0, le=40.0)
    source: str = Field(
        default="manual",
        description="'iot_wearable', 'manual', 'caregiver_reported'",
    )


class PatientProfile(BaseModel):
    """Complete patient profile — built automatically from all interactions.

    The profile grows richer with every voice note, prescription photo,
    and IoT reading. No structured data entry required from the caregiver.
    """

    patient_id: str = Field(description="Firestore document ID")
    caregiver_id: str = Field(description="Firebase Auth UID of the linked caregiver")

    # Demographics
    name: str = Field(min_length=1, max_length=200)
    age_years: Optional[int] = Field(default=None, ge=0, le=150)
    gender: Optional[str] = Field(default=None, max_length=20)
    blood_type: BloodType = BloodType.UNKNOWN
    preferred_language: str = Field(
        default="hi",
        description="BCP-47 language code. Default: Hindi",
    )

    # Medical history
    conditions: list[Condition] = Field(default_factory=list)
    medications: list[Medication] = Field(default_factory=list)
    allergies: list[Allergy] = Field(default_factory=list)
    surgeries: list[Surgery] = Field(default_factory=list)

    # Latest vitals from IoT / manual
    latest_vitals: Optional[Vitals] = None

    # Profile metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    incident_count: int = Field(default=0, ge=0)
    profile_completeness_pct: float = Field(
        default=0.0,
        ge=0.0,
        le=100.0,
        description="Estimated completeness of the patient profile",
    )

    @property
    def active_medications(self) -> list[Medication]:
        """Return only medications currently being taken."""
        return [m for m in self.medications if m.is_active]

    @property
    def critical_drug_names(self) -> list[str]:
        """Names of all active medications for quick cross-reference."""
        return [m.name for m in self.active_medications]


class PatientProfileCreate(BaseModel):
    """Input model for creating a new patient profile (minimal required fields)."""

    name: str = Field(min_length=1, max_length=200)
    age_years: Optional[int] = Field(default=None, ge=0, le=150)
    gender: Optional[str] = Field(default=None, max_length=20)
    preferred_language: str = Field(default="hi")


class PatientProfileUpdate(BaseModel):
    """Partial update model — only include fields to change."""

    name: Optional[str] = Field(default=None, max_length=200)
    age_years: Optional[int] = Field(default=None, ge=0, le=150)
    blood_type: Optional[BloodType] = None
    preferred_language: Optional[str] = None
    conditions: Optional[list[Condition]] = None
    medications: Optional[list[Medication]] = None
    allergies: Optional[list[Allergy]] = None
    surgeries: Optional[list[Surgery]] = None
    latest_vitals: Optional[Vitals] = None
