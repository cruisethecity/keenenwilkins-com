variable "hosted_zone_id" {
  description = "Route53 hosted zone id for the domain."
  type        = string
}

variable "domain_name" {
  description = "Apex or primary hostname to point at the distribution."
  type        = string
}

variable "subject_alternative_names" {
  description = "Extra hostnames that should also resolve to the distribution."
  type        = list(string)
  default     = []
}

variable "distribution_domain_name" {
  description = "CloudFront distribution hostname."
  type        = string
}

variable "distribution_hosted_zone_id" {
  description = "CloudFront hosted zone id, taken from the distribution output."
  type        = string
}
