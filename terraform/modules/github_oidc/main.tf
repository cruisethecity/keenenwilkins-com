###############################################################################
# GitHub Actions to AWS trust via OpenID Connect
#
# There are no IAM users and no access keys anywhere in this design. GitHub
# mints a short lived JSON Web Token for each workflow run, AWS validates the
# signature against the GitHub OIDC issuer, and STS hands back credentials
# that expire in an hour. Nothing long lived is ever stored in a repository
# secret, so there is nothing to rotate and nothing to leak.
#
# Three roles instead of one, because a plan and an apply do not need the same
# power:
#
#   deploy_frontend  write to one bucket, invalidate one distribution
#   plan_backend     read only across the account, plus state locking
#   apply_backend    write, gated behind a GitHub environment approval
###############################################################################

locals {
  github_issuer = "token.actions.githubusercontent.com"

  # Every subject claim that is allowed to assume a role in this account.
  # A subject looks like repo:owner/name:ref:refs/heads/main or
  # repo:owner/name:environment:production. Pinning it is the whole point.
  # A trust policy with sub set to repo:owner/name:* would let a pull request
  # from a fork assume the role.
  allowed_subjects = concat(
    [for branch in var.allowed_branches : "repo:${var.github_repository}:ref:refs/heads/${branch}"],
    [for environment in var.allowed_environments : "repo:${var.github_repository}:environment:${environment}"],
    var.additional_subjects,
  )

  state_bucket_arn = "arn:aws:s3:::${var.state_bucket_name}"
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

# --------------------------------------------------------------- oidc provider

# One provider per AWS account. If another project already created it, set
# create_oidc_provider to false and this module looks it up instead.
resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url            = "https://${local.github_issuer}"
  client_id_list = ["sts.amazonaws.com"]

  # AWS stopped validating these for well known IdPs in 2023, but the API
  # still accepts the list and older provider versions require it.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]

  tags = var.tags
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1

  url = "https://${local.github_issuer}"
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

# ------------------------------------------------------------- trust document

data "aws_iam_policy_document" "assume_with_oidc" {
  statement {
    sid     = "GitHubActionsWebIdentity"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.github_issuer}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "${local.github_issuer}:sub"
      values   = local.allowed_subjects
    }
  }
}

# ------------------------------------------------------ frontend deploy role

data "aws_iam_policy_document" "deploy_frontend" {
  statement {
    sid       = "ListSiteBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [var.site_bucket_arn]
  }

  statement {
    sid    = "SyncSiteObjects"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:PutObjectAcl",
    ]

    resources = ["${var.site_bucket_arn}/*"]
  }

  statement {
    sid    = "InvalidateOneDistribution"
    effect = "Allow"

    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
      "cloudfront:ListInvalidations",
    ]

    resources = [var.distribution_arn]
  }
}

resource "aws_iam_role" "deploy_frontend" {
  name                 = "${var.name_prefix}-gha-frontend-deploy"
  description          = "Assumed by the frontend workflow to sync the bundle and invalidate the cache."
  assume_role_policy   = data.aws_iam_policy_document.assume_with_oidc.json
  max_session_duration = 3600
  tags                 = var.tags
}

resource "aws_iam_role_policy" "deploy_frontend" {
  name   = "frontend-deploy"
  role   = aws_iam_role.deploy_frontend.id
  policy = data.aws_iam_policy_document.deploy_frontend.json
}

# ------------------------------------------------------------ state access

data "aws_iam_policy_document" "terraform_state" {
  statement {
    sid       = "ListStateBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [local.state_bucket_arn]
  }

  statement {
    sid    = "ReadWriteStateObject"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = ["${local.state_bucket_arn}/*"]
  }

  statement {
    sid    = "AcquireAndReleaseStateLock"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:DescribeTable",
    ]

    # The region segment is a wildcard on purpose. It keeps this module free of
    # the aws_region data source, whose attribute name changed between AWS
    # provider 5 and 6, while the table name still pins the resource.
    resources = [
      "arn:${data.aws_partition.current.partition}:dynamodb:*:${data.aws_caller_identity.current.account_id}:table/${var.state_lock_table_name}",
    ]
  }
}

# ------------------------------------------------------------ backend plan role

resource "aws_iam_role" "plan_backend" {
  name                 = "${var.name_prefix}-gha-backend-plan"
  description          = "Read only role used by terraform plan on every push."
  assume_role_policy   = data.aws_iam_policy_document.assume_with_oidc.json
  max_session_duration = 3600
  tags                 = var.tags
}

resource "aws_iam_role_policy_attachment" "plan_readonly" {
  role       = aws_iam_role.plan_backend.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/ReadOnlyAccess"
}

resource "aws_iam_role_policy" "plan_state" {
  name   = "terraform-state"
  role   = aws_iam_role.plan_backend.id
  policy = data.aws_iam_policy_document.terraform_state.json
}

# ----------------------------------------------------------- backend apply role

data "aws_iam_policy_document" "apply_backend" {
  # Read everything. A plan has to refresh resources it does not own.
  statement {
    sid    = "DescribeEverything"
    effect = "Allow"

    actions = [
      "acm:Describe*",
      "acm:Get*",
      "acm:List*",
      "apigateway:GET",
      "cloudfront:Get*",
      "cloudfront:List*",
      "cloudwatch:Describe*",
      "cloudwatch:Get*",
      "cloudwatch:List*",
      "dynamodb:Describe*",
      "dynamodb:List*",
      "iam:Get*",
      "iam:List*",
      "lambda:Get*",
      "lambda:List*",
      "logs:Describe*",
      "logs:List*",
      "route53:Get*",
      "route53:List*",
      "s3:Get*",
      "s3:List*",
      "sts:GetCallerIdentity",
      "tag:Get*",
    ]

    resources = ["*"]
  }

  # Write. Scoped by service because the resource level ARNs for creation
  # calls like lambda:CreateFunction are not known before the resource exists.
  statement {
    sid    = "ManageProjectInfrastructure"
    effect = "Allow"

    actions = [
      "acm:AddTagsToCertificate",
      "acm:DeleteCertificate",
      "acm:RequestCertificate",
      "apigateway:DELETE",
      "apigateway:PATCH",
      "apigateway:POST",
      "apigateway:PUT",
      "apigateway:TagResource",
      "apigateway:UntagResource",
      "cloudfront:CreateDistribution",
      "cloudfront:CreateInvalidation",
      "cloudfront:CreateOriginAccessControl",
      "cloudfront:CreateResponseHeadersPolicy",
      "cloudfront:DeleteDistribution",
      "cloudfront:DeleteOriginAccessControl",
      "cloudfront:DeleteResponseHeadersPolicy",
      "cloudfront:TagResource",
      "cloudfront:UntagResource",
      "cloudfront:UpdateDistribution",
      "cloudfront:UpdateOriginAccessControl",
      "cloudfront:UpdateResponseHeadersPolicy",
      "cloudwatch:DeleteAlarms",
      "cloudwatch:PutMetricAlarm",
      "cloudwatch:TagResource",
      "dynamodb:CreateTable",
      "dynamodb:DeleteTable",
      "dynamodb:TagResource",
      "dynamodb:UntagResource",
      "dynamodb:UpdateContinuousBackups",
      "dynamodb:UpdateTable",
      "lambda:AddPermission",
      "lambda:CreateFunction",
      "lambda:DeleteFunction",
      "lambda:PublishVersion",
      "lambda:RemovePermission",
      "lambda:TagResource",
      "lambda:UntagResource",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
      "logs:CreateLogGroup",
      "logs:DeleteLogGroup",
      "logs:PutRetentionPolicy",
      "logs:TagResource",
      "route53:ChangeResourceRecordSets",
      "route53:ChangeTagsForResource",
      "s3:CreateBucket",
      "s3:DeleteBucket",
      "s3:DeleteBucketPolicy",
      "s3:DeleteObject",
      "s3:PutBucketOwnershipControls",
      "s3:PutBucketPolicy",
      "s3:PutBucketPublicAccessBlock",
      "s3:PutBucketTagging",
      "s3:PutBucketVersioning",
      "s3:PutEncryptionConfiguration",
      "s3:PutLifecycleConfiguration",
      "s3:PutObject",
    ]

    resources = ["*"]
  }

  # IAM writes are the sharp edge of any pipeline role. Confine them to role
  # names this project owns so a compromised workflow cannot mint itself an
  # administrator role.
  statement {
    sid    = "ManageProjectRolesOnly"
    effect = "Allow"

    actions = [
      "iam:AttachRolePolicy",
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
      "iam:DetachRolePolicy",
      "iam:PutRolePolicy",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:UpdateAssumeRolePolicy",
      "iam:UpdateRole",
    ]

    resources = [
      "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/${var.name_prefix}-*",
    ]
  }

  statement {
    sid       = "PassExecutionRoleToLambdaOnly"
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/${var.name_prefix}-*"]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com"]
    }
  }

  # Explicitly forbid the two things that would turn this role into a
  # privilege escalation path even inside the name prefix.
  statement {
    sid    = "NeverTouchUsersOrAccessKeys"
    effect = "Deny"

    actions = [
      "iam:CreateAccessKey",
      "iam:CreateUser",
      "iam:DeleteAccessKey",
      "iam:UpdateAccessKey",
      "iam:CreateLoginProfile",
      "iam:UpdateLoginProfile",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role" "apply_backend" {
  name                 = "${var.name_prefix}-gha-backend-apply"
  description          = "Assumed only after a human approves the production environment gate."
  assume_role_policy   = data.aws_iam_policy_document.assume_with_oidc.json
  max_session_duration = 3600
  tags                 = var.tags
}

resource "aws_iam_role_policy" "apply_backend" {
  name   = "terraform-apply"
  role   = aws_iam_role.apply_backend.id
  policy = data.aws_iam_policy_document.apply_backend.json
}

resource "aws_iam_role_policy" "apply_state" {
  name   = "terraform-state"
  role   = aws_iam_role.apply_backend.id
  policy = data.aws_iam_policy_document.terraform_state.json
}
