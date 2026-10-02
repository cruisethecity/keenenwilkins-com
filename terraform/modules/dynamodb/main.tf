###############################################################################
# DynamoDB visitor counter table
#
# On demand billing. A resume site sees bursty, tiny traffic, so provisioned
# capacity would mean paying for idle throughput all month. On demand also
# removes the autoscaling policies you would otherwise have to tune.
###############################################################################

resource "aws_dynamodb_table" "counter" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "counter_id"

  attribute {
    name = "counter_id"
    type = "S"
  }

  # Encryption at rest with the AWS owned key. Swap in a customer managed key
  # by setting kms_key_arn if a compliance requirement calls for key rotation
  # you control.
  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_arn
  }

  point_in_time_recovery {
    enabled = var.point_in_time_recovery_enabled
  }

  deletion_protection_enabled = var.deletion_protection_enabled

  tags = merge(var.tags, {
    Name = var.table_name
  })

  lifecycle {
    # The counter value lives in this table. Never let a rename silently
    # replace it and reset the count to zero.
    prevent_destroy = false
  }
}
