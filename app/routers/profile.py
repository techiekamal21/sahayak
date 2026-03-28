"""Patient profile router — GET/POST /patient/profile."""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from google.cloud import firestore

from app.config import Settings, get_settings
from app.dependencies import GeminiDep, VisionDep
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.patient import (
    PatientProfile,
    PatientProfileCreate,
    PatientProfileUpdate,
)

router = APIRouter(prefix="/patient", tags=["patient"])
logger = logging.getLogger(__name__)

PATIENTS_COLLECTION = "patients"


@router.post(
    "/profile",
    response_model=PatientProfile,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new patient profile",
)
async def create_profile(
    data: PatientProfileCreate,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> PatientProfile:
    """Create a new patient profile linked to the authenticated caregiver."""
    patient_id = str(uuid.uuid4())
    profile = PatientProfile(
        patient_id=patient_id,
        caregiver_id=current_user.uid,
        name=data.name,
        age_years=data.age_years,
        gender=data.gender,
        preferred_language=data.preferred_language,
    )

    db = firestore.AsyncClient(project=settings.google_cloud_project)
    await db.collection(PATIENTS_COLLECTION).document(patient_id).set(
        profile.model_dump()
    )

    logger.info("Profile created — patient=%s caregiver=%s", patient_id, current_user.uid)
    return profile


@router.get(
    "/profile/{patient_id}",
    response_model=PatientProfile,
    status_code=status.HTTP_200_OK,
    summary="Get patient profile by ID",
)
async def get_profile(
    patient_id: str,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> PatientProfile:
    """Retrieve a patient profile. Only the linked caregiver can access."""
    db = firestore.AsyncClient(project=settings.google_cloud_project)
    doc = await db.collection(PATIENTS_COLLECTION).document(patient_id).get()

    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    data = doc.to_dict()
    if data.get("caregiver_id") != current_user.uid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return PatientProfile(**data)


@router.post(
    "/profile/{patient_id}/extract-from-document",
    response_model=PatientProfileUpdate,
    status_code=status.HTTP_200_OK,
    summary="Extract patient data from a prescription or document photo",
    description="Upload a prescription/discharge photo. Gemini extracts medical data and returns a ProfileUpdate.",
)
async def extract_from_document(
    patient_id: str,
    image: UploadFile,
    gemini: GeminiDep,
    vision: VisionDep,
    settings: Annotated[Settings, Depends(get_settings)],
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> PatientProfileUpdate:
    """Extract medical data from a photo and return as PatientProfileUpdate.

    The caregiver photographs a prescription or discharge paper.
    Vision OCR extracts raw text. Gemini parses it into structured medical data.
    The data is returned for review — not automatically applied to the profile.
    """
    image_bytes = await image.read()
    ocr_text = await vision.extract_text_from_image(image_bytes=image_bytes)

    if not ocr_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract text from the image. Please ensure the photo is clear.",
        )

    extracted = await gemini.extract_profile_data(raw_text=ocr_text)
    return PatientProfileUpdate(**{k: v for k, v in extracted.items() if v is not None})
