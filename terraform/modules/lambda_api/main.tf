###############################################################################
# Python Lambda plus API Gateway HTTP API
#
# Two deliberate choices worth defending in an interview:
#
# 1. HTTP API, not REST API. The visitor counter needs a proxy integration and
#    nothing else. HTTP APIs cost roughly a third of REST APIs per million
#    requests and add far less latency, and none of the REST only features
#    (request validation models, usage plans, WAF attachment) are in play here.
#
# 2. No cors_configuration block on the API. CORS is owned by the Lambda. If
#    both layers set Access Control Allow Origin the browser sees a duplicated
#    header and blocks the response, which is a genuinely painful bug to trace.
###############################################################################

locals {
  function_name  = var.function_name
  log_group_name = "/aws/lambda/${var.function_name}"
  api_log_group  = "/aws/apigateway/${var.function_name}"
}

# ------------------------------------------------------------------ packaging

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/.build/${var.function_name}.zip"

  excludes = [
    "__pycache__",
    "**/__pycache__",
    "**/*.pyc",
    ".pytest_cache",
  ]
}

# ----------------------------------------------------------------------- logs

resource "aws_cloudwatch_log_group" "lambda" {
  name              = local.log_group_name
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "api" {
  name              = local.api_log_group
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

# ------------------------------------------------------------------------ iam

data "aws_iam_policy_document" "assume_role" {
  statement {
    sid     = "LambdaServiceAssumeRole"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name                 = "${var.function_name}-role"
  description          = "Execution role for the visitor counter Lambda."
  assume_role_policy   = data.aws_iam_policy_document.assume_role.json
  max_session_duration = 3600
  tags                 = var.tags
}

# Least privilege. Two DynamoDB actions on one table ARN, and writes to one
# log group. No wildcard resources anywhere, and no managed policy attachment.
data "aws_iam_policy_document" "lambda" {
  statement {
    sid    = "WriteOwnLogs"
    effect = "Allow"

    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]

    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }

  statement {
    sid    = "CounterReadAndAtomicIncrement"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
    ]

    resources = [var.table_arn]
  }

  dynamic "statement" {
    for_each = var.tracing_mode == "Active" ? [1] : []

    content {
      sid    = "PublishTraceSegments"
      effect = "Allow"

      actions = [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
      ]

      resources = ["*"]
    }
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "${var.function_name}-policy"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda.json
}

# ------------------------------------------------------------------- function

resource "aws_lambda_function" "counter" {
  function_name = local.function_name
  description   = "Atomically increments and serves the site visitor count."
  role          = aws_iam_role.lambda.arn

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  handler = var.handler
  runtime = "python3.11"

  # Graviton. Cheaper per millisecond than x86 and the SDK is pure Python, so
  # there is no native wheel to worry about.
  architectures = ["arm64"]

  timeout     = var.timeout_seconds
  memory_size = var.memory_mb

  environment {
    variables = {
      TABLE_NAME      = var.table_name
      COUNTER_ID      = var.counter_id
      ALLOWED_ORIGINS = join(",", var.allowed_origins)
      LOG_LEVEL       = var.log_level
    }
  }

  tracing_config {
    mode = var.tracing_mode
  }

  tags = var.tags

  depends_on = [
    aws_iam_role_policy.lambda,
    aws_cloudwatch_log_group.lambda,
  ]
}

# ------------------------------------------------------------------- http api

resource "aws_apigatewayv2_api" "counter" {
  name          = "${var.function_name}-api"
  description   = "HTTP API front door for the visitor counter."
  protocol_type = "HTTP"

  # CORS is intentionally absent. See the header comment.

  tags = var.tags
}

resource "aws_apigatewayv2_integration" "counter" {
  api_id                 = aws_apigatewayv2_api.counter.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.counter.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = var.timeout_seconds * 1000
}

resource "aws_apigatewayv2_route" "routes" {
  for_each = toset([
    "GET ${var.route_path}",
    "POST ${var.route_path}",
    "OPTIONS ${var.route_path}",
  ])

  api_id    = aws_apigatewayv2_api.counter.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.counter.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.counter.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn

    format = jsonencode({
      requestId      = "$context.requestId"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      path           = "$context.path"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      latency        = "$context.responseLatency"
      integrationErr = "$context.integrationErrorMessage"
      sourceIp       = "$context.identity.sourceIp"
      userAgent      = "$context.identity.userAgent"
    })
  }

  default_route_settings {
    throttling_burst_limit   = var.throttle_burst_limit
    throttling_rate_limit    = var.throttle_rate_limit
    detailed_metrics_enabled = true
  }

  tags = var.tags
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowInvokeFromHttpApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.counter.function_name
  principal     = "apigateway.amazonaws.com"

  # Scoped to this API only, so a different API in the same account cannot
  # invoke the function.
  source_arn = "${aws_apigatewayv2_api.counter.execution_arn}/*/*${var.route_path}"
}

# --------------------------------------------------------------------- alarms

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.function_name}-errors"
  alarm_description   = "The visitor counter Lambda returned at least one error."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.counter.function_name
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions
  tags          = var.tags
}

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${var.function_name}-api-5xx"
  alarm_description   = "The counter API served 5xx responses."
  namespace           = "AWS/ApiGateway"
  metric_name         = "5xx"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.counter.id
  }

  alarm_actions = var.alarm_actions
  ok_actions    = var.alarm_actions
  tags          = var.tags
}
