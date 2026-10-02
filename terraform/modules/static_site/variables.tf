variable "bucket_name" {
  description = "Globally unique S3 bucket name for the built frontend."
  type        = string
}

variable "comment" {
  description = "CloudFront distribution comment shown in the console."
  type        = string
  default     = "Cloud resume static site"
}

variable "aliases" {
  description = "Alternate domain names on the distribution. Empty means use the CloudFront hostname."
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN in us-east-1. Null falls back to the default CloudFront certificate."
  type        = string
  default     = null
}

variable "api_domain_name" {
  description = "API Gateway hostname added to the Content Security Policy connect source."
  type        = string
  default     = null
}

variable "price_class" {
  description = "CloudFront price class. PriceClass_100 covers North America and Europe."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "price_class must be PriceClass_100, PriceClass_200 or PriceClass_All."
  }
}

variable "web_acl_arn" {
  description = "Optional AWS WAF web ACL ARN. Must be a CLOUDFRONT scope ACL created in us-east-1."
  type        = string
  default     = null
}

variable "geo_restriction_type" {
  description = "none, whitelist or blacklist."
  type        = string
  default     = "none"
}

variable "geo_restriction_locations" {
  description = "Two letter country codes used with whitelist or blacklist."
  type        = list(string)
  default     = []
}

variable "noncurrent_version_expiration_days" {
  description = "Days before superseded object versions are deleted."
  type        = number
  default     = 30
}

variable "force_destroy" {
  description = "Allow terraform destroy to empty the bucket first. Handy in a lab, dangerous in production."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to every resource in this module."
  type        = map(string)
  default     = {}
}
