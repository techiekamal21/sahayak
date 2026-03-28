"""Unit tests for FHIR R4 mapper — schema conformance and bundle integrity.

Tests that SAHAYAK internal models correctly map to FHIR R4 resources
and that the resulting bundles have all required fields.
"""

from __future__ import annotations

import pytest

from app.models.fhir import FHIRBundle
from app.models.incident import TriageLevel
from app.services.fhir.mapper import (
    build_fhir_bundle,
    build_fhir_conditions,
    build_fhir_medications,
    build_fhir_patient,
)


class TestFHIRPatientMapping:
    """Tests FHIR Patient resource construction."""

    def test_patient_resource_type_is_patient(self, sample_patient) -> None:
        result = build_fhir_patient(sample_patient)
        assert result.resourceType == "Patient"

    def test_patient_id_matches_profile(self, sample_patient) -> None:
        result = build_fhir_patient(sample_patient)
        assert result.id == sample_patient.patient_id

    def test_patient_name_is_structured(self, sample_patient) -> None:
        result = build_fhir_patient(sample_patient)
        assert len(result.name) > 0
        assert result.name[0]["use"] == "official"

    def test_patient_preferred_language_in_communication(self, sample_patient) -> None:
        result = build_fhir_patient(sample_patient)
        assert len(result.communication) > 0
        lang_code = result.communication[0]["language"]["coding"][0]["code"]
        assert lang_code == sample_patient.preferred_language


class TestFHIRConditionMapping:
    """Tests FHIR Condition resource construction."""

    def test_all_conditions_are_mapped(self, sample_patient) -> None:
        conditions = build_fhir_conditions(sample_patient)
        assert len(conditions) == len(sample_patient.conditions)

    def test_condition_resource_type(self, sample_patient) -> None:
        conditions = build_fhir_conditions(sample_patient)
        for condition in conditions:
            assert condition.resourceType == "Condition"

    def test_condition_has_subject_reference(self, sample_patient) -> None:
        conditions = build_fhir_conditions(sample_patient)
        for condition in conditions:
            assert condition.subject.reference == f"Patient/{sample_patient.patient_id}"

    def test_condition_has_clinical_status(self, sample_patient) -> None:
        conditions = build_fhir_conditions(sample_patient)
        for condition in conditions:
            assert condition.clinicalStatus.coding[0].code in ("active", "resolved")


class TestFHIRMedicationMapping:
    """Tests FHIR MedicationStatement resource construction."""

    def test_only_active_medications_mapped(self, sample_patient) -> None:
        statements = build_fhir_medications(sample_patient)
        # All medications in sample_patient are active
        assert len(statements) == len(sample_patient.active_medications)

    def test_medication_resource_type(self, sample_patient) -> None:
        statements = build_fhir_medications(sample_patient)
        for stmt in statements:
            assert stmt.resourceType == "MedicationStatement"

    def test_medication_status_is_active(self, sample_patient) -> None:
        statements = build_fhir_medications(sample_patient)
        for stmt in statements:
            assert stmt.status == "active"


class TestFHIRBundleAssembly:
    """Tests the complete FHIR R4 transaction bundle."""

    def test_bundle_resource_type_is_bundle(
        self, sample_patient, sample_emergency_analysis
    ) -> None:
        bundle = build_fhir_bundle(sample_patient, sample_emergency_analysis)
        assert bundle.resourceType == "Bundle"

    def test_bundle_type_is_transaction(
        self, sample_patient, sample_emergency_analysis
    ) -> None:
        bundle = build_fhir_bundle(sample_patient, sample_emergency_analysis)
        assert bundle.type == "transaction"

    def test_bundle_contains_patient_resource(
        self, sample_patient, sample_emergency_analysis
    ) -> None:
        bundle = build_fhir_bundle(sample_patient, sample_emergency_analysis)
        resource_types = [e.resource.get("resourceType") for e in bundle.entry]
        assert "Patient" in resource_types

    def test_bundle_contains_condition_resources(
        self, sample_patient, sample_emergency_analysis
    ) -> None:
        bundle = build_fhir_bundle(sample_patient, sample_emergency_analysis)
        resource_types = [e.resource.get("resourceType") for e in bundle.entry]
        assert "Condition" in resource_types

    def test_bundle_contains_medication_statements(
        self, sample_patient, sample_emergency_analysis
    ) -> None:
        bundle = build_fhir_bundle(sample_patient, sample_emergency_analysis)
        resource_types = [e.resource.get("resourceType") for e in bundle.entry]
        assert "MedicationStatement" in resource_types

    def test_bundle_contains_triage_observation(
        self, sample_patient, sample_emergency_analysis
    ) -> None:
        bundle = build_fhir_bundle(sample_patient, sample_emergency_analysis)
        resource_types = [e.resource.get("resourceType") for e in bundle.entry]
        assert "Observation" in resource_types

    def test_bundle_has_sahayak_tag(
        self, sample_patient, sample_emergency_analysis
    ) -> None:
        bundle = build_fhir_bundle(sample_patient, sample_emergency_analysis)
        tags = bundle.meta.get("tag", [])
        tag_codes = [t.get("code") for t in tags]
        assert "emergency-brief" in tag_codes

    def test_bundle_is_json_serialisable(
        self, sample_patient, sample_emergency_analysis
    ) -> None:
        """Bundle must be serialisable to valid JSON for FHIR store submission."""
        import json

        bundle = build_fhir_bundle(sample_patient, sample_emergency_analysis)
        json_str = bundle.model_dump_json()
        parsed = json.loads(json_str)
        assert parsed["resourceType"] == "Bundle"
        assert len(parsed["entry"]) > 0
