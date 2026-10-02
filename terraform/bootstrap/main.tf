###############################################################################
# Remote state backend bootstrap
#
# Chicken and egg problem: Terraform cannot store its state in a bucket that
# Terraform has not created yet. So this tiny root module runs once with a
# local state file and creates the two resources the real stack needs.
#
# Run it once, commit the local state file nowhere, and never point a CI
# pipeline at it. Everything else in terraform/environments uses the S3
# backend this creates.
###############################################################################

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.60.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

data "aws_caller_identity" "current" {}

locals {
  # Bucket names are globally unique across every AWS account, so the account
  # id keeps this from colliding with someone else's.
  state_bucket_name = coalesce(
    var.state_bucket_name,
    "${var.project_name}-tfstate-${data.aws_caller_identity.current.account_id}",
  )
}

resource "aws_s3_bucket" "state" {
  bucket = local.state_bucket_name

  # State files describe your whole account. Losing one is a bad afternoon.
  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = local.state_bucket_name }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  # Versioning is the recovery path for a corrupted or truncated state write.
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  depends_on = [aws_s3_bucket_versioning.state]
}

data "aws_iam_policy_document" "state" {
  statement {
    sid    = "DenyUnencryptedTransport"
    effect = "Deny"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.state.arn,
      "${aws_s3_bucket.state.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id
  policy = data.aws_iam_policy_document.state.json
}

# State locking. Two applies running at once against the same state is how
# you end up with orphaned resources and a state file that no longer matches
# reality. The lock table makes the second one wait.
resource "aws_dynamodb_table" "lock" {
  name         = var.state_lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = var.state_lock_table_name }
}
