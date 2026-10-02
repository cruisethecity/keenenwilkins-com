variable "aws_region" {
  description = "Region the state bucket and lock table live in."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short project slug used to name resources."
  type        = string
  default     = "cloud-resume"
}

variable "state_bucket_name" {
  description = "Override the generated state bucket name. Null builds one from the project and account id."
  type        = string
  default     = null
}

variable "state_lock_table_name" {
  description = "Name of the DynamoDB state lock table."
  type        = string
  default     = "cloud-resume-tf-locks"
}

variable "tags" {
  description = "Default tags applied to the bootstrap resources."
  type        = map(string)

  default = {
    Project   = "cloud-resume"
    Component = "terraform-state"
    ManagedBy = "terraform"
  }
}
