terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.60.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Every resource in the stack inherits these. Tag hygiene is what makes a
  # cost report readable six months later.
  default_tags {
    tags = local.tags
  }
}

# CloudFront reads certificates only from us-east-1. This alias exists purely
# so the ACM module can be created there while the rest of the stack lives in
# whatever region var.aws_region names.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.tags
  }
}
