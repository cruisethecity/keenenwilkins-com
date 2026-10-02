###############################################################################
# ACM certificate for the CloudFront distribution
#
# CloudFront only reads certificates from us-east-1, no matter where the rest
# of the stack lives. The root module passes the aliased us-east-1 provider in,
# which is why this module declares a configuration_aliases free provider
# requirement and never sets a region itself.
###############################################################################

resource "aws_acm_certificate" "site" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  # Replacing a certificate that is attached to a live distribution fails
  # unless the new one exists first.
  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, { Name = var.domain_name })
}

# DNS validation records. Route53 is a global service so the provider region
# here is irrelevant.
resource "aws_route53_record" "validation" {
  for_each = {
    for option in aws_acm_certificate.site.domain_validation_options :
    option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  zone_id         = var.hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# Blocks the apply until AWS has actually seen the DNS records and issued the
# certificate. Without this, CloudFront can be handed a pending certificate
# and the apply fails several minutes later.
resource "aws_acm_certificate_validation" "site" {
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]

  timeouts {
    create = "15m"
  }
}
