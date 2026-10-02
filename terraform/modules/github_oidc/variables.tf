variable "name_prefix" {
  description = "Prefix for every role name. Also scopes the IAM write permissions."
  type        = string
}

variable "github_repository" {
  description = "Repository in owner/name form, for example cruisethecity/keenenwilkins-com."
  type        = string

  validation {
    condition     = length(split("/", var.github_repository)) == 2
    error_message = "github_repository must be in owner/name form."
  }
}

variable "allowed_branches" {
  description = "Branches whose workflow runs may assume these roles."
  type        = list(string)
  default     = ["main"]
}

variable "allowed_environments" {
  description = "GitHub environments whose runs may assume these roles."
  type        = list(string)
  default     = ["production"]
}

variable "additional_subjects" {
  description = "Escape hatch for extra OIDC subject claims. Keep this empty unless you need it."
  type        = list(string)
  default     = []
}

variable "create_oidc_provider" {
  description = "Create the GitHub OIDC provider. Set to false if the account already has one."
  type        = bool
  default     = true
}

variable "site_bucket_arn" {
  description = "ARN of the frontend bucket the deploy role may write to."
  type        = string
}

variable "distribution_arn" {
  description = "ARN of the CloudFront distribution the deploy role may invalidate."
  type        = string
}

variable "state_bucket_name" {
  description = "Name of the Terraform remote state bucket."
  type        = string
}

variable "state_lock_table_name" {
  description = "Name of the DynamoDB state lock table."
  type        = string
}

variable "tags" {
  description = "Tags applied to every role."
  type        = map(string)
  default     = {}
}
