###############################################################################
# Settings the laptop and the pipeline both read
#
# Terraform loads every *.auto.tfvars file in this folder without being told
# to, so a local apply and the CI plan see exactly the same values. Change a
# setting here, in one place, and both follow.
#
# terraform.tfvars stays out of git and holds only the names tied to one AWS
# account. A setting that lived there instead would never reach CI. The
# pipeline would plan with the default and undo whatever the laptop applied.
###############################################################################

aws_region   = "us-east-1"
project_name = "cloud-resume"

# GitHub puts these two numbers in the OIDC subject claim of every repository
# created after 15 July 2026, and the CI roles trust nothing without them.
# Neither is a secret. To print them:
#
#   gh api repos/cruisethecity/keenenwilkins-com --jq '.owner.id, .id'
github_owner_id      = "229628263"
github_repository_id = "1402324462"

# Brand new account, so no GitHub OIDC provider existed. Leave this true.
create_oidc_provider = true

# The site answers on its own domain. Route 53 registered keenenwilkins.com on
# 13 November 2026 and created the hosted zone with it. Setting the first line
# back to false returns the site to its CloudFront hostname and removes the
# certificate and the DNS records.
enable_custom_domain      = true
hosted_zone_name          = "keenenwilkins.com"
domain_name               = "keenenwilkins.com"
subject_alternative_names = ["www.keenenwilkins.com"]

# Lets vite dev at localhost:5173 call the live counter API.
# Set to false once you stop iterating against the deployed backend.
allow_local_development_origin = true

cloudfront_price_class = "PriceClass_100"
log_retention_days     = 30

tags = {
  Owner = "Keenen Wilkins"
}
