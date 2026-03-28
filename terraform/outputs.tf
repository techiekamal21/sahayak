output "cloud_run_url" {
  description = "SAHAYAK API endpoint URL"
  value       = google_cloud_run_v2_service.sahayak_api.uri
}

output "fhir_store_id" {
  description = "Cloud Healthcare FHIR store resource ID"
  value       = google_healthcare_fhir_store.sahayak_fhir_store.id
}

output "service_account_email" {
  description = "Runtime service account email"
  value       = google_service_account.sahayak_sa.email
}

output "artifact_registry_url" {
  description = "Docker image registry URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/sahayak"
}

output "kms_key_id" {
  description = "Cloud KMS key for patient data CMEK"
  value       = google_kms_crypto_key.sahayak_key.id
}
