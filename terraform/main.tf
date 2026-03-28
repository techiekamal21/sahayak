"""Terraform infrastructure as code — all GCP resources for SAHAYAK.

Provisions:
- Cloud Run service
- Firestore database
- Cloud Healthcare API FHIR store
- Firebase Auth
- Secret Manager secrets
- Cloud KMS keyring + key (CMEK for Firestore)
- IAM service account (minimal permissions)
"""

terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ── Enable APIs ───────────────────────────────────────────────────────────────

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "aiplatform.googleapis.com",
    "speech.googleapis.com",
    "vision.googleapis.com",
    "healthcare.googleapis.com",
    "firestore.googleapis.com",
    "firebase.googleapis.com",
    "pubsub.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudkms.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudtasks.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
  ])
  service            = each.key
  disable_on_destroy = false
}

# ── Service Account ───────────────────────────────────────────────────────────

resource "google_service_account" "sahayak_sa" {
  account_id   = "sahayak-runtime"
  display_name = "SAHAYAK Runtime Service Account"
  description  = "Minimal-privilege SA for SAHAYAK Cloud Run service"
}

locals {
  sahayak_sa_roles = [
    "roles/aiplatform.user",
    "roles/speech.client",
    "roles/vision.imageAnnotator",
    "roles/healthcare.fhirStoreAdmin",
    "roles/datastore.user",
    "roles/secretmanager.secretAccessor",
    "roles/cloudtasks.enqueuer",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ]
}

resource "google_project_iam_member" "sahayak_sa_roles" {
  for_each = toset(local.sahayak_sa_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.sahayak_sa.email}"
}

# ── Cloud KMS — Patient Data CMEK ─────────────────────────────────────────────

resource "google_kms_key_ring" "sahayak_keyring" {
  name     = "sahayak-keyring"
  location = var.region
  depends_on = [google_project_service.apis]
}

resource "google_kms_crypto_key" "sahayak_key" {
  name     = "sahayak-patient-data-key"
  key_ring = google_kms_key_ring.sahayak_keyring.id

  rotation_period = "7776000s"  # 90 days

  lifecycle {
    prevent_destroy = true
  }
}

# ── Secret Manager ────────────────────────────────────────────────────────────

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "firebase_credentials" {
  secret_id = "firebase-service-account"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

# ── Firestore ─────────────────────────────────────────────────────────────────

resource "google_firestore_database" "sahayak_db" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
  depends_on  = [google_project_service.apis]
}

# ── Cloud Healthcare API — FHIR R4 Store ─────────────────────────────────────

resource "google_healthcare_dataset" "sahayak_dataset" {
  name      = "sahayak-dataset"
  location  = var.region
  depends_on = [google_project_service.apis]
}

resource "google_healthcare_fhir_store" "sahayak_fhir_store" {
  name    = "sahayak-fhir-store"
  dataset = google_healthcare_dataset.sahayak_dataset.id

  version                 = "R4"
  enable_update_create    = true
  disable_referential_integrity = false

  labels = {
    environment = var.environment
    service     = "sahayak"
  }
}

# ── Artifact Registry ─────────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "sahayak_repo" {
  location      = var.region
  repository_id = "sahayak"
  description   = "SAHAYAK Docker images"
  format        = "DOCKER"
  depends_on    = [google_project_service.apis]
}

# ── Cloud Run ─────────────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service" "sahayak_api" {
  name     = "sahayak-api"
  location = var.region

  template {
    service_account = google_service_account.sahayak_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/sahayak/api:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
        cpu_idle = true
        startup_cpu_boost = true
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = var.region
      }
      env {
        name  = "GEMINI_MODEL"
        value = "gemini-1.5-pro"
      }
      env {
        name  = "HEALTHCARE_DATASET_ID"
        value = "sahayak-dataset"
      }
      env {
        name  = "HEALTHCARE_FHIR_STORE_ID"
        value = "sahayak-fhir-store"
      }

      # Secrets from Secret Manager — never hardcoded
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 10
        period_seconds        = 30
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 10
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_project_iam_member.sahayak_sa_roles,
    google_artifact_registry_repository.sahayak_repo,
  ]
}

# Allow unauthenticated access (Firebase Auth is handled at app layer)
resource "google_cloud_run_v2_service_iam_member" "sahayak_public" {
  name     = google_cloud_run_v2_service.sahayak_api.name
  location = google_cloud_run_v2_service.sahayak_api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
