###############################################################################
# Route53 alias records pointing at CloudFront
#
# Alias records, not CNAMEs. An alias is resolved inside Route53, so it works
# at the zone apex where a CNAME is illegal, and Route53 charges nothing for
# alias queries to an AWS target.
###############################################################################

locals {
  # Every hostname that should resolve to the distribution.
  record_names = toset(concat([var.domain_name], var.subject_alternative_names))
}

resource "aws_route53_record" "ipv4" {
  for_each = local.record_names

  zone_id = var.hosted_zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = var.distribution_domain_name
    zone_id                = var.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "ipv6" {
  for_each = local.record_names

  zone_id = var.hosted_zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = var.distribution_domain_name
    zone_id                = var.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}
