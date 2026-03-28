"""FHIR R4 resource models for hospital notification.

These models map SAHAYAK's internal data structures to
HL7 FHIR R4 standard resources that any hospital EMR can consume.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FHIRCoding(BaseModel):
    """FHIR Coding datatype."""

    system: str
    code: str
    display: Optional[str] = None


class FHIRCodeableConcept(BaseModel):
    """FHIR CodeableConcept datatype."""

    coding: list[FHIRCoding] = Field(default_factory=list)
    text: Optional[str] = None


class FHIRReference(BaseModel):
    """FHIR Reference datatype."""

    reference: str
    display: Optional[str] = None


class FHIRPatient(BaseModel):
    """FHIR R4 Patient resource (minimal required fields for ER intake)."""

    resourceType: str = "Patient"
    id: str
    name: list[dict] = Field(default_factory=list)
    gender: Optional[str] = None
    birthDate: Optional[str] = None
    communication: list[dict] = Field(default_factory=list)


class FHIRCondition(BaseModel):
    """FHIR R4 Condition resource — maps to medical conditions."""

    resourceType: str = "Condition"
    id: str
    subject: FHIRReference
    code: FHIRCodeableConcept
    clinicalStatus: FHIRCodeableConcept
    verificationStatus: FHIRCodeableConcept
    recordedDate: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class FHIRMedicationStatement(BaseModel):
    """FHIR R4 MedicationStatement — maps to active medications."""

    resourceType: str = "MedicationStatement"
    id: str
    subject: FHIRReference
    status: str = "active"
    medication: FHIRCodeableConcept
    effectivePeriod: dict = Field(default_factory=dict)


class FHIRObservation(BaseModel):
    """FHIR R4 Observation — maps to vitals and clinical observations."""

    resourceType: str = "Observation"
    id: str
    status: str = "final"
    category: list[FHIRCodeableConcept] = Field(default_factory=list)
    code: FHIRCodeableConcept
    subject: FHIRReference
    effectiveDateTime: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    valueQuantity: Optional[dict] = None
    valueString: Optional[str] = None


class FHIRBundleEntry(BaseModel):
    """Single entry in a FHIR Bundle."""

    fullUrl: str
    resource: dict
    request: dict = Field(
        default_factory=lambda: {"method": "POST", "url": ""}
    )


class FHIRBundle(BaseModel):
    """FHIR R4 Transaction Bundle — sent to Cloud Healthcare API FHIR store.

    The hospital EMR receives this bundle and can create/update patient records
    immediately upon the ambulance being dispatched.
    """

    resourceType: str = "Bundle"
    type: str = "transaction"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    entry: list[FHIRBundleEntry] = Field(default_factory=list)
    meta: dict = Field(
        default_factory=lambda: {
            "tag": [{"system": "https://sahayak.ai/tags", "code": "emergency-brief"}]
        }
    )
