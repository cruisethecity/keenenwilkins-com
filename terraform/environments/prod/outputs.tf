output "site_url" {
  description = "Open this in a browser once the frontend workflow has run."
  value       = module.static_site.site_url
}

output "cloudfront_domain_name" {
  description = "CloudFront hostname of the distribution."
  value       = module.static_site.distribution_domain_name
}

output "site_bucket_name" {
  description = "Set this as the S3_BUCKET repository variable."
  value       = module.static_site.bucket_name
}

output "cloudfront_distribution_id" {
  description = "Set this as the CLOUDFRONT_DISTRIBUTION_ID repository variable."
  value       = module.static_site.distribution_id
}

output "api_base_url" {
  description = "Set this as the VITE_API_BASE_URL repository variable."
  value       = module.lambda_api.api_endpoint
}

output "counter_url" {
  description = "Full counter endpoint. Curl it to smoke test the backend."
  value       = module.lambda_api.counter_url
}

output "api_domain" {
  description = "Exact API hostname. Use it to tighten the Content Security Policy connect source."
  value       = module.lambda_api.api_domain
}

output "dynamodb_table_name" {
  description = "Visitor counter table."
  value       = module.dynamodb.table_name
}

output "lambda_function_name" {
  description = "Deployed function name."
  value       = module.lambda_api.function_name
}

output "cors_allowed_origins" {
  description = "Origins the API currently trusts. Check here first when the badge shows a dash."
  value       = local.browser_origins
}

output "github_frontend_role_arn" {
  description = "Set this as the AWS_FRONTEND_ROLE_ARN repository variable."
  value       = module.github_oidc.frontend_deploy_role_arn
}

output "github_plan_role_arn" {
  description = "Set this as the AWS_PLAN_ROLE_ARN repository variable."
  value       = module.github_oidc.backend_plan_role_arn
}

output "github_apply_role_arn" {
  description = "Set this as the AWS_APPLY_ROLE_ARN repository variable."
  value       = module.github_oidc.backend_apply_role_arn
}

output "repository_variables" {
  description = "Every GitHub repository variable this pipeline needs, in one place."

  value = {
    AWS_REGION                 = var.aws_region
    AWS_FRONTEND_ROLE_ARN      = module.github_oidc.frontend_deploy_role_arn
    AWS_PLAN_ROLE_ARN          = module.github_oidc.backend_plan_role_arn
    AWS_APPLY_ROLE_ARN         = module.github_oidc.backend_apply_role_arn
    S3_BUCKET                  = module.static_site.bucket_name
    CLOUDFRONT_DISTRIBUTION_ID = module.static_site.distribution_id
    VITE_API_BASE_URL          = module.lambda_api.api_endpoint
    TF_STATE_BUCKET            = var.state_bucket_name
    TF_LOCK_TABLE              = var.state_lock_table_name
  }
}
