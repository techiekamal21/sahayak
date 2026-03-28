"""FHIR R4 mapper — converts SAHAYAK models to FHIR R4 resources.

Maps internal PatientProfile + EmergencyAnalysis → FHIR R4 Bundle
that hospitals can ingest via their EMR systems.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from app.models.fhir import (
    FHIRBundle,
    FHIRBundleEntry,
    FHIRCodeableConcept,
    FHIRCoding,
    FHIRCondition,
    FHIRMedicationStatement,
    FHIRObservation,
    FHIRPatient,
    FHIRReference,
)
from app.models.incident import EmergencyAnalysis, TriageLevel
from app.models.patient import PatientProfile


def _gen_id() -> str:
    """Generate a short UUID for FHIR resource IDs."""
    return str(uuid.uuid4())


def _patient_reference(patient_id: str) -> FHIRReference:
    return FHIRReference(reference=f"Patient/{patient_id}", display="Emergency Patient")


def build_fhir_patient(patient: PatientProfile) -> FHIRPatient:
    """Map PatientProfile → FHIR R4 Patient resource."""
    name_parts = patient.name.split(" ", 1)
    given = [name_parts[0]]
    family = name_parts[1] if len(name_parts) > 1 else ""

    communication = []
    if patient.preferred_language:
        communication.append(
            {
                "language": {
                    "coding": [
                        {
                            "system": "urn:ietf:bcp:47",
                            "code": patient.preferred_language,
                        }
                    ]
                }
            }
        )

    return FHIRPatient(
        id=patient.patient_id,
        name=[{"use": "official", "family": family, "given": given}],
        gender=patient.gender,
        communication=communication,
    )


def build_fhir_conditions(patient: PatientProfile) -> list[FHIRCondition]:
    """Map PatientProfile.conditions → list of FHIR R4 Condition resources."""
    conditions = []
    ref = _patient_reference(patient.patient_id)

    for condition in patient.conditions:
        coding = FHIRCoding(
            system="http://snomed.info/sct",
            code=condition.icd_code or "unknown",
            display=condition.name,
        )
        conditions.append(
            FHIRCondition(
                id=_gen_id(),
                subject=ref,
                code=FHIRCodeableConcept(coding=[coding], text=condition.name),
                clinicalStatus=FHIRCodeableConcept(
                    coding=[FHIRCoding(
                        system="http://terminology.hl7.org/CodeSystem/condition-clinical",
                        code="active" if condition.is_chronic else "resolved",
                    )]
                ),
                verificationStatus=FHIRCodeableConcept(
                    coding=[FHIRCoding(
                        system="http://terminology.hl7.org/CodeSystem/condition-ver-status",
                        code="confirmed",
                    )]
                ),
            )
        )
    return conditions


def build_fhir_medications(patient: PatientProfile) -> list[FHIRMedicationStatement]:
    """Map active medications → FHIR R4 MedicationStatement resources."""
    statements = []
    ref = _patient_reference(patient.patient_id)

    for med in patient.active_medications:
        statements.append(
            FHIRMedicationStatement(
                id=_gen_id(),
                subject=ref,
                status="active",
                medication=FHIRCodeableConcept(
                    coding=[FHIRCoding(
                        system="http://www.nlm.nih.gov/research/umls/rxnorm",
                        code="unknown",
                        display=med.name,
                    )],
                    text=f"{med.name} {med.dosage or ''}".strip(),
                ),
                effectivePeriod={"start": datetime.utcnow().isoformat()},
            )
        )
    return statements


def build_fhir_emergency_observation(
    patient: PatientProfile, analysis: EmergencyAnalysis,
) -> FHIRObservation:
    """Build a FHIR Observation for the SAHAYAK emergency assessment."""
    triage_severity_map = {
        TriageLevel.CRITICAL: ("critical", "CRITICAL — Call ambulance immediately"),
        TriageLevel.URGENT: ("severe", "URGENT — See doctor within 2 hours"),
        TriageLevel.MODERATE: ("moderate", "MODERATE — GP visit today"),
        TriageLevel.STABLE: ("mild", "STABLE — Routine management"),
        TriageLevel.CALL_108_IMMEDIATELY: ("critical", "CALL 108 — Uncertain, default to emergency"),
    }
    severity_code, severity_display = triage_severity_map.get(
        analysis.triage_level, ("unknown", "Unknown")
    )

    return FHIRObservation(
        id=_gen_id(),
        status="final",
        category=[
            FHIRCodeableConcept(
                coding=[FHIRCoding(
                    system="http://terminology.hl7.org/CodeSystem/observation-category",
                    code="survey",
                )]
            )
        ],
        code=FHIRCodeableConcept(
            coding=[FHIRCoding(
                system="https://sahayak.ai/codes",
                code="emergency-triage",
                display="SAHAYAK Emergency Triage Assessment",
            )],
            text="AI Emergency Triage",
        ),
        subject=_patient_reference(patient.patient_id),
        valueString=(
            f"Triage: {severity_display}. "
            f"Chief Complaint: {analysis.chief_complaint}. "
            f"Hospital Brief: {analysis.hospital_brief}"
        ),
    )


def build_fhir_bundle(
    patient: PatientProfile, analysis: EmergencyAnalysis
) -> FHIRBundle:
    """Assemble complete FHIR R4 transaction bundle for hospital notification.

    This bundle contains:
    1. Patient demographic resource
    2. All active conditions
    3. All active medications
    4. Emergency triage observation

    The hospital EMR ingests this bundle on transaction commit.
    """
    entries: list[FHIRBundleEntry] = []

    # 1. Patient
    fhir_patient = build_fhir_patient(patient)
    entries.append(FHIRBundleEntry(
        fullUrl=f"urn:uuid:{patient.patient_id}",
        resource=fhir_patient.model_dump(),
        request={"method": "PUT", "url": f"Patient/{patient.patient_id}"},
    ))

    # 2. Conditions
    for condition in build_fhir_conditions(patient):
        entries.append(FHIRBundleEntry(
            fullUrl=f"urn:uuid:{condition.id}",
            resource=condition.model_dump(),
            request={"method": "POST", "url": "Condition"},
        ))

    # 3. Medications
    for med_stmt in build_fhir_medications(patient):
        entries.append(FHIRBundleEntry(
            fullUrl=f"urn:uuid:{med_stmt.id}",
            resource=med_stmt.model_dump(),
            request={"method": "POST", "url": "MedicationStatement"},
        ))

    # 4. Emergency triage observation
    observation = build_fhir_emergency_observation(patient, analysis)
    entries.append(FHIRBundleEntry(
        fullUrl=f"urn:uuid:{observation.id}",
        resource=observation.model_dump(),
        request={"method": "POST", "url": "Observation"},
    ))

    return FHIRBundle(entry=entries)
