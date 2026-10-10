output "oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider in use."
  value       = local.oidc_provider_arn
}

output "frontend_deploy_role_arn" {
  description = "Set this as the AWS_FRONTEND_ROLE_ARN repository variable."
  value       = aws_iam_role.deploy_frontend.arn
}

output "backend_plan_role_arn" {
  description = "Set this as the AWS_PLAN_ROLE_ARN repository variable."
  value       = aws_iam_role.plan_backend.arn
}

output "backend_apply_role_arn" {
  description = "Set this as the AWS_APPLY_ROLE_ARN repository variable."
  value       = aws_iam_role.apply_backend.arn
}

output "allowed_subjects" {
  description = "OIDC subject claims trusted by each role. Useful when debugging a 403 on assume role."

  value = {
    frontend = local.frontend_subjects
    plan     = local.plan_subjects
    apply    = local.apply_subjects
  }
}
