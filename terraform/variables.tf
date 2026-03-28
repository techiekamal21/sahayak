variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region — asia-south1 (Mumbai) for India-optimal latency"
  type        = string
  default     = "asia-south1"
}

variable "environment" {
  description = "Deployment environment: dev, staging, production"
  type        = string
  default     = "production"
}
