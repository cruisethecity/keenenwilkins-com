variable "aws_region" {
  description = "Region for the application resources. CloudFront and the certificate are global regardless."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short slug that prefixes every resource name."
  type        = string
  default     = "cloud-resume"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,30}$", var.project_name))
    error_message = "project_name must be lowercase letters, digits and dashes."
  }
}

# ------------------------------------------------------------- custom domain

variable "enable_custom_domain" {
  description = <<-EOT
    Master switch for the domain. False ships the site on the CloudFront
    hostname and creates no ACM certificate and no Route53 records. Flip it to
    true, fill in hosted_zone_name and domain_name, and apply again.
  EOT
  type        = bool
  default     = false
}

variable "hosted_zone_name" {
  description = "Existing Route53 hosted zone name, with the trailing dot optional. Ignored unless enable_custom_domain is true."
  type        = string
  default     = null
}

variable "domain_name" {
  description = "Primary hostname for the site. Ignored unless enable_custom_domain is true."
  type        = string
  default     = null
}

variable "subject_alternative_names" {
  description = "Extra hostnames, for example the www host."
  type        = list(string)
  default     = []
}

# ---------------------------------------------------------------- application

variable "counter_id" {
  description = "Partition key value of the single counter item."
  type        = string
  default     = "site_total"
}

variable "allow_local_development_origin" {
  description = "Add http://localhost:5173 to the API CORS allowlist so vite dev can hit the live counter."
  type        = bool
  default     = true
}

variable "additional_allowed_origins" {
  description = "Any other exact origins allowed to call the counter API."
  type        = list(string)
  default     = []
}

variable "cloudfront_price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_100"
}

variable "log_retention_days" {
  description = "CloudWatch retention for the Lambda and API access logs."
  type        = number
  default     = 30
}

variable "alarm_sns_topic_arns" {
  description = "Optional SNS topics notified by the error alarms."
  type        = list(string)
  default     = []
}

variable "deletion_protection_enabled" {
  description = "Block accidental deletion of the counter table."
  type        = bool
  default     = true
}

variable "force_destroy_site_bucket" {
  description = "Let terraform destroy empty the site bucket. Leave false in production."
  type        = bool
  default     = false
}

# ----------------------------------------------------------------------- cicd

variable "github_repository" {
  description = "Repository in owner/name form that CI runs from."
  type        = string
}

variable "github_owner_id" {
  description = "Numeric ID of the GitHub account that owns the repository. GitHub puts it in the OIDC subject claim for repositories created after 15 July 2026."
  type        = string
  default     = ""
}

variable "github_repository_id" {
  description = "Numeric ID of the repository, the other half of the same subject claim."
  type        = string
  default     = ""
}

variable "allowed_branches" {
  description = "Branches allowed to assume the deploy roles."
  type        = list(string)
  default     = ["main"]
}

variable "allowed_environments" {
  description = "GitHub environments allowed to assume the deploy roles."
  type        = list(string)
  default     = ["production"]
}

variable "create_oidc_provider" {
  description = "Create the GitHub OIDC provider. False if this account already has one."
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------- state

variable "state_bucket_name" {
  description = "Remote state bucket name, used to scope the CI role policies."
  type        = string
}

variable "state_lock_table_name" {
  description = "State lock table name, used to scope the CI role policies."
  type        = string
  default     = "cloud-resume-tf-locks"
}

# ----------------------------------------------------------------------- tags

variable "tags" {
  description = "Extra tags merged into the default tag set."
  type        = map(string)
  default     = {}
}
