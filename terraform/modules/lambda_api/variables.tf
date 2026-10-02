variable "function_name" {
  description = "Name of the Lambda function. Also seeds the API and log group names."
  type        = string
}

variable "source_dir" {
  description = "Directory to zip. Must contain the visitor_counter package."
  type        = string
}

variable "handler" {
  description = "Lambda handler path inside the package."
  type        = string
  default     = "visitor_counter.handler.lambda_handler"
}

variable "table_name" {
  description = "DynamoDB table name passed to the function as an environment variable."
  type        = string
}

variable "table_arn" {
  description = "DynamoDB table ARN used to scope the execution role policy."
  type        = string
}

variable "counter_id" {
  description = "Partition key value of the single counter item."
  type        = string
  default     = "site_total"
}

variable "allowed_origins" {
  description = "Exact origins allowed to call the API. No wildcards in production."
  type        = list(string)

  validation {
    condition     = length(var.allowed_origins) > 0
    error_message = "Provide at least one allowed origin."
  }
}

variable "route_path" {
  description = "Path the counter is served on."
  type        = string
  default     = "/visits"

  validation {
    condition     = startswith(var.route_path, "/")
    error_message = "route_path must begin with a forward slash."
  }
}

variable "timeout_seconds" {
  description = "Function timeout. A single DynamoDB call never needs more than a few seconds."
  type        = number
  default     = 5
}

variable "memory_mb" {
  description = "Memory allocation. Higher memory also buys more CPU, which shortens cold starts."
  type        = number
  default     = 256
}

variable "log_retention_days" {
  description = "CloudWatch log retention. Never leave this unset or logs are kept forever and billed forever."
  type        = number
  default     = 30
}

variable "log_level" {
  description = "Python log level for the function."
  type        = string
  default     = "INFO"
}

variable "tracing_mode" {
  description = "X Ray tracing mode. Active or PassThrough."
  type        = string
  default     = "Active"

  validation {
    condition     = contains(["Active", "PassThrough"], var.tracing_mode)
    error_message = "tracing_mode must be Active or PassThrough."
  }
}

variable "throttle_burst_limit" {
  description = "API Gateway burst limit. Caps the blast radius of a scripted flood."
  type        = number
  default     = 50
}

variable "throttle_rate_limit" {
  description = "API Gateway steady state request rate per second."
  type        = number
  default     = 25
}

variable "alarm_actions" {
  description = "Optional list of SNS topic ARNs notified when an alarm fires."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags applied to every resource in this module."
  type        = map(string)
  default     = {}
}
