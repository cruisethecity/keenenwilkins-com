###############################################################################
# Production root module
#
# Dependency order, which is also the order to read this file in:
#
#   dynamodb     the counter table
#   acm  + dns   only when a custom domain is switched on
#   static_site  private bucket plus CloudFront with OAC
#   lambda_api   Python function plus HTTP API, allowlisting the site origin
#   github_oidc  keyless CI roles scoped to the bucket and distribution above
#
# The static site does not depend on the API and the API does depend on the
# site. That direction is deliberate. The Lambda CORS allowlist has to name
# the exact site origin, which means it needs the CloudFront hostname, so the
# Content Security Policy uses a host pattern for the API rather than an exact
# name. Reversing it would create a dependency cycle between the two modules.
###############################################################################

locals {
  name_prefix = var.project_name

  tags = merge(var.tags, {
    Project     = var.project_name
    Environment = "prod"
    ManagedBy   = "terraform"
    Repository  = var.github_repository
  })

  # Hostnames the site answers on. Empty list means the CloudFront hostname.
  site_aliases = var.enable_custom_domain ? concat([var.domain_name], var.subject_alternative_names) : []

  # Origins the counter API trusts. Exact strings, no wildcards.
  browser_origins = compact(concat(
    [for host in local.site_aliases : "https://${host}"],
    ["https://${module.static_site.distribution_domain_name}"],
    var.allow_local_development_origin ? ["http://localhost:5173"] : [],
    var.additional_allowed_origins,
  ))

  # Host pattern for the Content Security Policy connect source. Once the API
  # id is stable you can replace this with the exact hostname printed by the
  # api_domain output, which tightens the policy by one more notch.
  api_csp_host = "*.execute-api.${var.aws_region}.amazonaws.com"
}

# ------------------------------------------------------------------- database

module "dynamodb" {
  source = "../../modules/dynamodb"

  table_name                     = "${local.name_prefix}-visitors"
  point_in_time_recovery_enabled = true
  deletion_protection_enabled    = var.deletion_protection_enabled
  tags                           = local.tags
}

# --------------------------------------------------------------- custom domain

# Only looked up when a custom domain is switched on, so the stack applies
# cleanly in an account with no hosted zones at all.
data "aws_route53_zone" "site" {
  count = var.enable_custom_domain ? 1 : 0

  name         = var.hosted_zone_name
  private_zone = false
}

module "acm" {
  source = "../../modules/acm"
  count  = var.enable_custom_domain ? 1 : 0

  providers = {
    aws = aws.us_east_1
  }

  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  hosted_zone_id            = data.aws_route53_zone.site[0].zone_id
  tags                      = local.tags
}

# ---------------------------------------------------------------- static site

module "static_site" {
  source = "../../modules/static_site"

  bucket_name     = "${local.name_prefix}-site-${data.aws_caller_identity.current.account_id}"
  comment         = "${var.project_name} resume single page application"
  aliases         = local.site_aliases
  api_domain_name = local.api_csp_host

  acm_certificate_arn = var.enable_custom_domain ? module.acm[0].certificate_arn : null

  price_class   = var.cloudfront_price_class
  force_destroy = var.force_destroy_site_bucket
  tags          = local.tags
}

module "dns" {
  source = "../../modules/dns"
  count  = var.enable_custom_domain ? 1 : 0

  hosted_zone_id            = data.aws_route53_zone.site[0].zone_id
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names

  distribution_domain_name    = module.static_site.distribution_domain_name
  distribution_hosted_zone_id = module.static_site.distribution_hosted_zone_id
}

# --------------------------------------------------------------------- backend

module "lambda_api" {
  source = "../../modules/lambda_api"

  function_name = "${local.name_prefix}-visitor-counter"
  source_dir    = "${path.module}/../../../backend/src"

  table_name = module.dynamodb.table_name
  table_arn  = module.dynamodb.table_arn
  counter_id = var.counter_id

  allowed_origins = local.browser_origins

  log_retention_days = var.log_retention_days
  alarm_actions      = var.alarm_sns_topic_arns
  tags               = local.tags
}

# ------------------------------------------------------------------------ cicd

module "github_oidc" {
  source = "../../modules/github_oidc"

  name_prefix          = local.name_prefix
  github_repository    = var.github_repository
  allowed_branches     = var.allowed_branches
  allowed_environments = var.allowed_environments
  create_oidc_provider = var.create_oidc_provider

  site_bucket_arn  = module.static_site.bucket_arn
  distribution_arn = module.static_site.distribution_arn

  state_bucket_name     = var.state_bucket_name
  state_lock_table_name = var.state_lock_table_name

  tags = local.tags
}

data "aws_caller_identity" "current" {}
