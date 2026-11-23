# Cloud Resume Challenge scorecard

The sixteen baseline steps of the AWS Cloud Resume Challenge, scored against
what is in this repository, followed by the places this build goes past them.

Source for the steps: https://cloudresumechallenge.dev/docs/the-challenge/aws/

Last scored 23 November 2026.

| Status | Means |
|---|---|
| `done` | A command or a URL proves it right now |
| `partial` | Some of the step is met and the rest is named |
| `deviation` | Deliberately not done the way the challenge words it, with the reason given |

A workflow that has never run is not a passing step, it is a guess. Nothing
below is marked `done` on the strength of code that has not executed.

---

## The sixteen baseline steps

| # | Step | Status | Evidence, or what is missing |
|---|---|---|---|
| 1 | Certification | `done` | AWS Certified Cloud Practitioner and AWS Certified Solutions Architect Associate, both listed on the page and in the resume PDF. The challenge asks for Cloud Practitioner |
| 2 | Resume in HTML | `done` | A React single page application in `frontend/src`, served as HTML. Not a Word file and not a PDF, which is what the step guards against |
| 3 | CSS | `done` | Tailwind CSS 4, with the design tokens in the `@theme` block in `frontend/src/index.css` |
| 4 | S3 static website | `deviation` | The bucket holds the site, but S3 static website hosting is not enabled. The bucket is fully private, with all four public access blocks on, and CloudFront reaches it through Origin Access Control. Static website hosting needs a publicly readable bucket, so this is the stronger pattern |
| 5 | HTTPS via CloudFront | `done` | `https://keenenwilkins.com`. Plain HTTP is redirected, the custom certificate has a TLS 1.2 floor, and HSTS is set for two years with `includeSubdomains` and `preload` |
| 6 | Custom domain via DNS | `done` | Registered through Route 53. An ACM certificate validated by DNS, and alias records for IPv4 and IPv6, all in Terraform. Known gap: `www` serves the page instead of redirecting to the apex |
| 7 | JavaScript visitor counter | `done` | `frontend/src/hooks/useVisitorCount.js` calls the API and the page renders the count as the Live Telemetry badge. It counts once per browser session and fails quietly if the API is down |
| 8 | DynamoDB, on demand | `done` | `billing_mode = "PAY_PER_REQUEST"`, the pricing model the challenge suggests. Point in time recovery, encryption at rest and deletion protection are on |
| 9 | API in front of the database | `done` | API Gateway HTTP API to Lambda. The browser never addresses DynamoDB |
| 10 | Python with boto3 | `done` | `backend/src/visitor_counter/handler.py`, Python 3.11 on arm64. The increment is a single atomic `UpdateItem`, not a read then write, so concurrent hits cannot lose a count |
| 11 | Tests for the Python | `done` | 18 tests under `pytest` in `backend/`, and CI fails the build under 90 percent coverage |
| 12 | Infrastructure as code | `done` | Terraform, which the step allows in place of SAM, and for the whole stack rather than only the API. Two things in the account were done by hand: the Identity Center setup, and registering the domain, which created its hosted zone |
| 13 | Source control | `done` | This repository |
| 14 | CI/CD, back end | `done` | `.github/workflows/backend-deploy.yml`: lint, unit tests, a Checkov scan, plan, apply of the saved plan, then a smoke test, authenticated through OIDC with no stored key. First green run 14 November 2026. Since 23 November the apply job waits for a required reviewer on the `production` environment. Known gap: the Checkov scan reports and does not yet fail the build |
| 15 | CI/CD, front end | `done` + `deviation` | `.github/workflows/frontend-deploy.yml`: lint, build, sync to S3, CloudFront invalidation, then a live check that the site returns 200. The deviation: the challenge asks for a second repository, and this is one repository with two independent pipelines, each started only by changes under its own paths |
| 16 | Blog post linked from the resume | `partial` | Three technical write ups are in `frontend/src/content/posts/`. The post about what the build taught me is written and not yet published |

**Score: 14 done, 1 partial, 2 deviations.** Step 15 is counted as done and as
a deviation.

---

## Where this build goes past the baseline

Nothing in this section was required.

### Credentials

- **No IAM user and no access key exists anywhere in this account.** GitHub
  mints a short lived OIDC token per run and STS exchanges it for credentials
  that expire in an hour. There is nothing to rotate and nothing to leak.
- **Zero repository secrets.** All ten pipeline values are repository
  variables, because none of them is a credential.
- **The trust policy pins the subject.** Each role allows only the exact
  claim its own job presents. The claims are in the form GitHub sends for
  repositories created after 15 July 2026, `repo:OWNER@OWNER_ID/NAME@REPO_ID:...`,
  which carries the numeric owner and repository IDs, so a deleted name that
  someone else registers later cannot match. The first deploy of this site
  failed because the policy was written in the older form.
- **Three roles, not one.** A front end deploy can write one bucket and
  invalidate one distribution. A plan is read only. An apply is trusted only
  for the `production` environment, which requires an approval.
- **The apply role carries an explicit Deny** with the SID
  `NeverTouchUsersOrAccessKeys`, covering user and access key creation. CI
  cannot mint a long lived credential even if its own policy were later
  widened by mistake.
- **`iam:PassRole` is conditioned** to `lambda.amazonaws.com`.
- **Local access is IAM Identity Center**, not a key on disk.

### The edge and the bucket

- Private bucket plus Origin Access Control, rather than public static website
  hosting. See step 4.
- A bucket policy statement, `DenyUnencryptedTransport`, that refuses plain
  HTTP outright instead of only redirecting it.
- `BucketOwnerEnforced` ownership, AES256 with bucket keys, versioning on, and
  a lifecycle rule that expires old bundle versions.
- A response headers policy with a real Content Security Policy,
  `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`, HSTS with
  preload and a `Permissions-Policy`.

### Operations

- X-Ray active tracing on the Lambda.
- Two CloudWatch alarms, one on Lambda errors and one on API 5xx, both with
  `treat_missing_data = notBreaching` so an idle site does not alarm.
- Structured JSON access logging on the API stage.
- Throttling at 25 requests per second sustained, 50 burst.
- arm64 Lambda at 256MB with a 5 second timeout.
- 30 day log retention set explicitly, so logs do not bill forever by default.

### Process

- `scripts/verify.sh`, one command that runs every local gate: toolchain
  versions against the CI pins, frontend lint and build, backend tests and
  ruff, `terraform fmt` and `validate` on both roots.
- `scripts/build-resume.mjs`, which prints the resume PDF from the same data
  file the page reads, so the two cannot drift apart.
- `scripts/apple-audit.mjs`, a Playwright script that reads computed styles off
  live Apple pages and diffs them against this site's design tokens.

---

## What is next

| Item | Passes when |
|---|---|
| Supply chain extension, the official one | Commits are signed, CodeQL runs on every merge, the back end build publishes an SBOM, and a dependency scan can fail the build |
| Checkov can fail the build, actions pinned by commit | A finding stops the pipeline, and no action is referenced by a moving tag |
| Alarms notify someone | Both alarms publish to an SNS topic with a subscriber |
| `www` redirects to the apex | A request to `www` returns a redirect, not a second copy of the page |

---

## What it costs

About fifty cents a month when idle, which is the Route 53 hosted zone, plus
the yearly renewal of the domain. Both DynamoDB tables are on demand, Lambda
and API Gateway bill per request, and the ACM certificate is free.
