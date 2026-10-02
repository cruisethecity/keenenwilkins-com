output "record_fqdns" {
  description = "Every hostname now pointing at the distribution."
  value       = [for record in aws_route53_record.ipv4 : record.fqdn]
}
