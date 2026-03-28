"""Incident history router — GET /incidents/{patient_id}."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore

from app.config import Settings, get_settings
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.incident import EmergencyAnalysis, IncidentSummary

router = APIRouter(prefix="/incidents", tags=["incidents"])
logger = logging.getLogger(__name__)

PATIENTS_COLLECTION = "patients"
INCIDENTS_COLLECTION = "incidents"


@router.get(
    "/{patient_id}",
    response_model=list[IncidentSummary],
    status_code=status.HTTP_200_OK,
    summary="List all incidents for a patient",
)
async def list_incidents(
    patient_id: str,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    limit: int = 20,
) -> list[IncidentSummary]:
    """Return incident history for a patient, most recent first."""
    db = firestore.AsyncClient(project=settings.google_cloud_project)

    # Verify ownership
    patient_doc = await db.collection(PATIENTS_COLLECTION).document(patient_id).get()
    if not patient_doc.exists or patient_doc.to_dict().get("caregiver_id") != current_user.uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    query = (
        db.collection(INCIDENTS_COLLECTION)
        .where("patient_id", "==", patient_id)
        .order_by("analyzed_at", direction=firestore.Query.DESCENDING)
        .limit(limit)
    )

    docs = await query.get()
    summaries = []
    for doc in docs:
        data = doc.to_dict()
        summaries.append(
            IncidentSummary(
                incident_id=doc.id,
                patient_id=data["patient_id"],
                triage_level=data["triage_level"],
                primary_concern=data["primary_concern"],
                analyzed_at=data["analyzed_at"],
                hospital_notified=data.get("fhir_trigger", False),
            )
        )

    return summaries


@router.get(
    "/{patient_id}/{incident_id}",
    response_model=EmergencyAnalysis,
    status_code=status.HTTP_200_OK,
    summary="Get full details of a specific incident",
)
async def get_incident(
    patient_id: str,
    incident_id: str,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> EmergencyAnalysis:
    """Return the full emergency analysis for a specific incident."""
    db = firestore.AsyncClient(project=settings.google_cloud_project)

    # Verify patient ownership
    patient_doc = await db.collection(PATIENTS_COLLECTION).document(patient_id).get()
    if not patient_doc.exists or patient_doc.to_dict().get("caregiver_id") != current_user.uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    incident_doc = await db.collection(INCIDENTS_COLLECTION).document(incident_id).get()
    if not incident_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    return EmergencyAnalysis(**incident_doc.to_dict())
