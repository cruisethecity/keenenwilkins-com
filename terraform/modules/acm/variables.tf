variable "domain_name" {
  description = "Primary domain the certificate is issued for."
  type        = string
}

variable "subject_alternative_names" {
  description = "Additional names on the certificate, for example the www host."
  type        = list(string)
  default     = []
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone id that holds the validation records."
  type        = string
}

variable "tags" {
  description = "Tags applied to the certificate."
  type        = map(string)
  default     = {}
}
