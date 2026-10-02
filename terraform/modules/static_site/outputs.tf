output "bucket_name" {
  description = "Name of the private origin bucket."
  value       = aws_s3_bucket.site.id
}

output "bucket_arn" {
  description = "ARN of the private origin bucket."
  value       = aws_s3_bucket.site.arn
}

output "distribution_id" {
  description = "CloudFront distribution id. The deploy workflow needs this to invalidate the cache."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN."
  value       = aws_cloudfront_distribution.site.arn
}

output "distribution_domain_name" {
  description = "CloudFront hostname, for example d1234abcd.cloudfront.net."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "distribution_hosted_zone_id" {
  description = "Fixed CloudFront hosted zone id used by Route53 alias records."
  value       = aws_cloudfront_distribution.site.hosted_zone_id
}

output "site_url" {
  description = "Primary URL of the deployed site."
  value       = length(var.aliases) > 0 ? "https://${var.aliases[0]}" : "https://${aws_cloudfront_distribution.site.domain_name}"
}
