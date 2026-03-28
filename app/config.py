"""SAHAYAK application configuration using Pydantic Settings.

All configuration is environment-variable driven. No hardcoded credentials.
Secrets are fetched from Google Secret Manager at startup.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings — all values sourced from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Google Cloud ────────────────────────────────────────────────────────
    google_cloud_project: str = Field(default="sahayak-demo", description="GCP project ID")
    google_cloud_region: str = Field(
        default="asia-south1",
        description="GCP region (Mumbai for India-optimal latency)",
    )

    # ── Vertex AI / Gemini ─────────────────────────────────────────────────
    gemini_model: str = Field(
        default="gemini-1.5-pro",
        description="Gemini model version",
    )
    gemini_api_key: str | None = Field(
        default=None,
        description="Gemini API Key for lightweight deployment without explicit Vertex GCP config",
    )
    gemini_temperature: float = Field(
        default=0.1,
        description="Temperature for clinical decisions — kept low for consistency",
    )
    gemini_max_tokens: int = Field(default=2048)

    # ── Firebase Auth ──────────────────────────────────────────────────────
    firebase_project_id: str = Field(
        default="",
        description="Firebase project ID (may differ from GCP project)",
    )

    # ── Firestore ──────────────────────────────────────────────────────────
    firestore_database: str = Field(
        default="(default)",
        description="Firestore database ID",
    )

    # ── Cloud Healthcare / FHIR ────────────────────────────────────────────
    healthcare_dataset_id: str = Field(
        default="sahayak-dataset",
        description="Cloud Healthcare API dataset ID",
    )
    healthcare_fhir_store_id: str = Field(
        default="sahayak-fhir-store",
        description="Cloud Healthcare FHIR store ID",
    )

    # ── Safety ─────────────────────────────────────────────────────────────
    safety_confidence_threshold: float = Field(
        default=0.70,
        description="Minimum Gemini confidence — below this triggers 108 fallback",
    )

    # ── App ────────────────────────────────────────────────────────────────
    app_name: str = "SAHAYAK"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False)
    log_level: str = Field(default="INFO")


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton. Use as FastAPI dependency."""
    return Settings()  # type: ignore[call-arg]
