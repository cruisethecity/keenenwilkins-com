output "table_name" {
  description = "Name of the visitor counter table."
  value       = aws_dynamodb_table.counter.name
}

output "table_arn" {
  description = "ARN of the visitor counter table, used to scope the Lambda IAM policy."
  value       = aws_dynamodb_table.counter.arn
}
