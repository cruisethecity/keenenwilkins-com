output "api_endpoint" {
  description = "Invoke URL of the HTTP API, without a trailing slash."
  value       = aws_apigatewayv2_api.counter.api_endpoint
}

output "counter_url" {
  description = "Full URL the frontend should call."
  value       = "${aws_apigatewayv2_api.counter.api_endpoint}${var.route_path}"
}

output "api_id" {
  description = "HTTP API identifier."
  value       = aws_apigatewayv2_api.counter.id
}

output "api_domain" {
  description = "Hostname of the API, useful for a Content Security Policy connect source."
  value       = replace(aws_apigatewayv2_api.counter.api_endpoint, "https://", "")
}

output "function_name" {
  description = "Deployed Lambda function name."
  value       = aws_lambda_function.counter.function_name
}

output "function_arn" {
  description = "Deployed Lambda function ARN."
  value       = aws_lambda_function.counter.arn
}

output "role_arn" {
  description = "Execution role ARN."
  value       = aws_iam_role.lambda.arn
}
