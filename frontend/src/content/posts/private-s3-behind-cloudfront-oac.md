---
title: A private S3 bucket, and the condition everyone forgets
date: 2026-08-10
category: Architecture
summary: Origin Access Control locks an S3 bucket so only CloudFront can read it. Without one specific policy condition, it locks it so that any CloudFront distribution in any AWS account can read it.
tags: [S3, CloudFront, OAC, IAM]
---

The old way to host a static site on AWS was to turn on S3 static website hosting and make the bucket public. It works, and it means every object in that bucket is readable by the entire internet, directly, bypassing your CDN, your cache headers and your security headers.

Origin Access Control is the current answer. The bucket stays completely private. No public ACLs, no public policy, no website endpoint. CloudFront signs each request to the origin with SigV4, and the bucket policy allows exactly that.

## The setup

Four resources, and they have to agree with each other.

```hcl
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "resume-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

Then the origin references it, and it must use the bucket's regional domain name, not the website endpoint:

```hcl
origin {
  origin_id                = "s3-resume"
  domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
  origin_access_control_id = aws_cloudfront_origin_access_control.site.id
}
```

Using `website_endpoint` here is a common mistake. A website endpoint is an HTTP only public interface, so OAC cannot sign to it and the whole arrangement silently falls back to needing a public bucket.

## The condition

Here is the bucket policy most examples give you:

```json
{
  "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::my-bucket/*"
}
```

That policy grants the CloudFront service principal read access to your bucket. Not your distribution. The service. Anyone, in any AWS account, can create a distribution pointing at your bucket and it will serve their traffic on their domain, billed to you, with none of your security headers.

The condition is the entire security boundary:

```hcl
condition {
  test     = "StringEquals"
  variable = "AWS:SourceArn"
  values   = [aws_cloudfront_distribution.site.arn]
}
```

Now the only principal that can read an object is CloudFront acting on behalf of that one distribution.

Terraform handles the circular look of this cleanly. The distribution references the OAC, the bucket policy references the distribution ARN, and Terraform orders it correctly on its own. There is no real cycle because the bucket policy is a separate resource from the bucket.

While you are in that policy, deny plaintext access outright:

```hcl
statement {
  effect  = "Deny"
  actions = ["s3:*"]
  condition {
    test     = "Bool"
    variable = "aws:SecureTransport"
    values   = ["false"]
  }
}
```

## The single page application problem

S3 has no concept of your client side routes. A visitor who opens a deep link directly asks S3 for an object that does not exist, and gets a 403, because the bucket is private and privacy means it will not even confirm the object is missing.

CloudFront fixes it at the edge:

```hcl
custom_error_response {
  error_code            = 403
  response_code         = 200
  response_page_path    = "/index.html"
  error_caching_min_ttl = 10
}
```

Map 404 the same way. The application boots and its router resolves the path.

Keep the error caching TTL low. The default is five minutes, which means a genuinely missing asset gets cached as a 200 serving your HTML, and during a deploy that is exactly the window where an old asset request can get poisoned.

## Cache headers are two rules, not one

Vite fingerprints every built asset, so `index-B9k2n.js` is immutable by construction. `index.html` is not, and it is the file that points at those hashes.

```bash
aws s3 sync dist "s3://$BUCKET" --delete \
  --exclude "*" --include "assets/*" \
  --cache-control "public, max-age=31536000, immutable"

aws s3 sync dist "s3://$BUCKET" --delete \
  --exclude "assets/*" \
  --cache-control "public, max-age=0, must-revalidate"
```

One cache policy for everything gives you a choice between never caching anything, or shipping an `index.html` that browsers hold for a year while it references asset hashes you deleted in the last deploy. That second failure mode presents as a blank white page for returning visitors only, which is a miserable thing to debug.

Assets go up first, then the HTML. For the few seconds in between, the bucket holds new assets that nothing references yet, which is harmless. The reverse order leaves an HTML file pointing at assets that are not there.

Then invalidate, and wait for it:

```bash
ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DIST" --paths "/*" \
  --query 'Invalidation.Id' --output text)

aws cloudfront wait invalidation-completed \
  --distribution-id "$DIST" --id "$ID"
```

Without the wait, the workflow goes green while edge locations are still serving the previous build, and any smoke test in the same job tests the old site.

## What the whole thing costs

Under a dollar a month at portfolio traffic. The bucket holds a few hundred kilobytes, CloudFront's free tier covers the requests, DynamoDB on demand rounds to nothing at this volume, and Lambda's free tier is not remotely threatened by a visitor counter.

Price class 100 keeps the distribution on North American and European edges. Adding Asia Pacific edges to a resume site is paying for latency nobody is measuring.
