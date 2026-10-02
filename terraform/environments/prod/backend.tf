###############################################################################
# Remote state with S3 plus DynamoDB locking
#
# This is a partial configuration on purpose. A backend block cannot reference
# variables, so hardcoding a bucket name here would mean editing tracked code
# for every account. Instead the values arrive at init time.
#
# Locally:
#   terraform init -backend-config=backend.hcl
#
# In CI:
#   terraform init \
#     -backend-config="bucket=$TF_STATE_BUCKET" \
#     -backend-config="dynamodb_table=$TF_LOCK_TABLE"
#
# Run terraform/bootstrap once first to create both resources.
###############################################################################

terraform {
  backend "s3" {
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true

    # bucket         = supplied at init
    # dynamodb_table = supplied at init
  }
}
