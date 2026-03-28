"""Cloud Healthcare API FHIR R4 sender — hospital ER notification.

Delivers structured FHIR R4 bundles to the hospital's FHIR store.
Called asynchronously via Cloud Tasks — never blocks the caregiver UI.
"""

from __future__ import annotations

import json
import logging

from google.cloud import healthcare_v1

from app.models.incident import EmergencyAnalysis
from app.models.patient import PatientProfile
from app.services.fhir.mapper import build_fhir_bundle

logger = logging.getLogger(__name__)


class FHIRSenderService:
    """Delivers structured patient brief to hospital FHIR store.

    The FHIR store acts as the interoperability layer between SAHAYAK
    and hospital EMR systems. Any FHIR R4-compatible EMR can consume
    the bundles this service sends.
    """

    def __init__(
        self,
        project: str,
        dataset_id: str = "sahayak-dataset",
        fhir_store_id: str = "sahayak-fhir-store",
        location: str = "asia-south1",
    ) -> None:
        self.client = healthcare_v1.FhirServiceClient()
        self.fhir_store_name = (
            f"projects/{project}/locations/{location}/"
            f"datasets/{dataset_id}/fhirStores/{fhir_store_id}"
        )
        logger.info("FHIRSenderService initialised — store: %s", self.fhir_store_name)

    async def send_emergency_brief(
        self,
        patient: PatientProfile,
        analysis: EmergencyAnalysis,
    ) -> str:
        """Build and send a FHIR R4 transaction bundle to the hospital store.

        Args:
            patient: Full patient profile to include in the bundle
            analysis: Emergency analysis from Gemini (already safety-validated)

        Returns:
            FHIR server transaction response (JSON string)
        """
        bundle = build_fhir_bundle(patient, analysis)
        bundle_json = bundle.model_dump_json()

        logger.info(
            "Sending FHIR bundle — patient=%s, entries=%d, triage=%s",
            patient.patient_id,
            len(bundle.entry),
            analysis.triage_level,
        )

        request = healthcare_v1.ExecuteBundleRequest(
            parent=self.fhir_store_name,
            body={
                "contentType": "application/fhir+json",
                "data": bundle_json.encode("utf-8"),
            },
        )

        response = self.client.execute_bundle(request=request)
        response_text = response.data.decode("utf-8")

        logger.info(
            "FHIR bundle sent successfully — patient=%s, response_len=%d",
            patient.patient_id,
            len(response_text),
        )

        return response_text

    def verify_fhir_store_accessible(self) -> bool:
        """Quick check that the FHIR store is reachable. Used in health checks."""
        try:
            request = healthcare_v1.GetFhirStoreRequest(name=self.fhir_store_name)
            self.client.get_fhir_store(request=request)
            return True
        except Exception:
            logger.exception("FHIR store not accessible: %s", self.fhir_store_name)
            return False
