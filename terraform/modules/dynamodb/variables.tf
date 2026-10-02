variable "table_name" {
  description = "Name of the DynamoDB table that holds the visitor counter."
  type        = string
}

variable "point_in_time_recovery_enabled" {
  description = "Enable continuous backups with 35 days of point in time recovery."
  type        = bool
  default     = true
}

variable "deletion_protection_enabled" {
  description = "Block accidental table deletion through the API or console."
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "Optional customer managed KMS key ARN. Null uses the AWS owned key."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags applied to the table."
  type        = map(string)
  default     = {}
}
