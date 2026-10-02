output "state_bucket_name" {
  description = "Pass this to terraform init as the bucket backend config value."
  value       = aws_s3_bucket.state.id
}

output "state_lock_table_name" {
  description = "Pass this to terraform init as the dynamodb_table backend config value."
  value       = aws_dynamodb_table.lock.name
}

output "backend_config_snippet" {
  description = "Copy this into terraform/environments/prod/backend.hcl."

  value = <<-EOT
    bucket         = "${aws_s3_bucket.state.id}"
    key            = "prod/terraform.tfstate"
    region         = "${var.aws_region}"
    dynamodb_table = "${aws_dynamodb_table.lock.name}"
    encrypt        = true
  EOT
}
