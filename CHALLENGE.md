# Cloud Resume Challenge, build out and scorecard

What this file is: the sixteen baseline requirements of the AWS Cloud Resume
Challenge, scored honestly against what is actually in this repository, plus
the places this build goes past the baseline, plus the official extensions and
which are worth taking.

Source for the baseline: https://cloudresumechallenge.dev/docs/the-challenge/aws/
Source for the extensions: https://cloudresumechallenge.dev/docs/extensions/

First scored 10 October 2026, after the first local `terraform apply` created
34 resources in account `556071986480`. Rescored 14 November 2026, after both
pipelines ran green and the custom domain went live.

Status vocabulary, used strictly:

| Status | Means |
|---|---|
| `done` | A command or a URL proves it right now |
| `unproven` | The code exists and looks correct but has never executed |
| `partial` | Some of the requirement is met and the rest is named below |
| `open` | Not built |
| `deviation` | Deliberately not done the way the challenge words it, with the reason given |

The distinction between `done` and `unproven` is the whole point of this file.
A workflow that has never run is not a passing step, it is a guess.

---

## The sixteen baseline steps

| # | Step | Status | Evidence, or what is missing |
|---|---|---|---|
| 1 | Certification | `done` | AWS Certified Cloud Practitioner and AWS Certified Solutions Architect Associate, both listed in `frontend/src/data/resumeData.json` under `credentials.certifications`. The challenge asks for Cloud Practitioner, so this clears it twice over |
| 2 | Resume in HTML | `done` | React single page application in `frontend/src`, served as HTML. Not a Word file and not a PDF, which is what the step is guarding against |
| 3 | CSS | `done` | Tailwind CSS 4.3, with the design tokens in the `@theme` block in `frontend/src/index.css` |
| 4 | S3 static website | `deviation` | Bucket `cloud-resume-site-556071986480` exists and holds the site, but S3 static website hosting is **not** enabled. The bucket is fully private, with all four public access blocks on, and CloudFront reaches it through an Origin Access Control signed with SigV4. Static website hosting requires a publicly readable bucket, so this is the stronger pattern, not a shortcut. Call this out in the writeup rather than hoping nobody asks |
| 5 | HTTPS via CloudFront | `done` | Distribution `E22SRI686ERPFP`, serving `https://keenenwilkins.com` and still answering at `https://dqviqcoub6ym4.cloudfront.net`. `viewer_protocol_policy = redirect-to-https`, a minimum of TLS 1.2 on the custom certificate, plus HSTS at two years with `includeSubdomains` and `preload` |
| 6 | Custom domain via DNS | `done` | `https://keenenwilkins.com` and `https://www.keenenwilkins.com` both return 200, applied 14 November. Registered through Route 53, ACM certificate validated by DNS, alias records for IPv4 and IPv6, all of it switched on by four lines in `terraform/environments/prod/shared.auto.tfvars`. One gap against this project's own bar: `www` serves the page instead of redirecting to the apex |
| 7 | JavaScript visitor counter | `done` | `frontend/src/hooks/useVisitorCount.js` calls the API and the site renders it as the Live Telemetry badge. On 14 November the badge on the live site read 1 on the first load and 10 later the same day, and `GET /visits` from the `keenenwilkins.com` origin returned that count |
| 8 | DynamoDB, on demand | `done` | Table `cloud-resume-visitors`, `billing_mode = "PAY_PER_REQUEST"`, which is the pricing model the challenge says it prefers. Point in time recovery on, encryption at rest on |
| 9 | API in front of the database | `done` | API Gateway HTTP API `csx0oz2840` to Lambda. The browser never addresses DynamoDB. The Lambda execution role can reach exactly one table and exactly one log group, nothing else |
| 10 | Python with boto3 | `done` | `backend/src/visitor_counter/handler.py`, Python 3.11 on arm64, `import boto3` at line 33, `boto3.resource("dynamodb")` at line 67. The increment is a single atomic `UpdateItem`, not a read then write, so concurrent hits cannot lose a count |
| 11 | Tests for the Python | `done` | 18 tests passing under `pytest` in `backend/`. Run them with `scripts/verify.sh` |
| 12 | Infrastructure as code | `done` | Terraform, which the step allows in place of SAM. Nothing in this account was created by hand in the console except the Identity Center setup itself. Modules under `terraform/modules`, a separate bootstrap root for remote state, state in S3 with locking |
| 13 | Source control | `partial` | Repo is `cruisethecity/keenenwilkins-com`. **Private as of 14 November.** The challenge does not require public, but this site's own claims do, and the approval gate in step 14 needs public on a free GitHub plan |
| 14 | CI/CD, back end | `done` | `.github/workflows/backend-deploy.yml` ran green on 14 November, run `43632832581`: unit tests, static analysis, plan, apply, smoke test, authenticated through OIDC with no stored key. Two caveats, stated rather than hidden. It was started by hand through `workflow_dispatch`, because the force push that day did not trigger path filtered workflows. And the apply ran without an approval gate, because the `production` environment cannot hold a required reviewer while the repo is private |
| 15 | CI/CD, front end | `done` + `deviation` | `.github/workflows/frontend-deploy.yml` ran green on 14 November, run `43632829788`, in 59 seconds: build, sync to S3, CloudFront invalidation, wait, then a live check that the site returns 200. Started by hand for the same reason as step 14. The deviation: the challenge says to use a second repository, this is one monorepo with two independent workflows. The intent, separate pipelines for front and back end, is met. The literal wording is not. Say so rather than letting a reader catch it |
| 16 | Blog post linked from the resume | `partial` | Three build specific posts exist at `frontend/src/content/posts/`: atomic counters in DynamoDB, keyless deploys with OIDC, private S3 behind CloudFront OAC. Those are technical explainers. The step asks for what you learned, and none of the three dev.to posts in `externalPosts.json` is about this project. Needs one reflection post, which is also the most useful thing to write while the details are fresh |

**Baseline score: 13 done, 2 partial, 2 deviations.**

No row is unproven any more. The real work left on the baseline is step 16
and making the repo public.

---

## Where this build already goes past the baseline

These are the answers to "so what did you actually learn", and they are worth
more in an interview than any of the sixteen checkboxes. Nothing here was
required.

### Credentials

- **No IAM user and no access key exists anywhere in this account.** GitHub
  mints a short lived OIDC token per run and STS exchanges it for credentials
  that expire in an hour. There is nothing to rotate and nothing to leak.
- **Zero repository secrets.** All ten pipeline values are repository
  variables, because none of them is a credential.
- **The trust policy pins the subject.** Each role allows only the exact
  claim its own job presents, a push to `main` for the deploy and plan roles
  and the `production` environment for the apply role. The claims are in the
  form GitHub has sent since July 2026, `repo:OWNER@OWNER_ID/NAME@REPO_ID:...`,
  which carries the numeric owner and repository IDs, so a deleted name that
  someone else registers later cannot match. A wildcard there would let a
  fork's pull request assume the role.
- **Three roles, not one.** A front end deploy can write one bucket and
  invalidate one distribution. A plan is read only. An apply is gated behind a
  GitHub environment approval.
- **The apply role carries an explicit Deny** with the SID
  `NeverTouchUsersOrAccessKeys`, covering `iam:CreateUser`,
  `iam:CreateAccessKey`, `iam:UpdateAccessKey`, `iam:DeleteAccessKey` and the
  login profile actions. CI cannot mint a long lived credential even if its
  own policy were later widened by mistake.
- **`iam:PassRole` is conditioned** to `lambda.amazonaws.com` and scoped to
  `cloud-resume-*`.
- **Local access is Identity Center**, not a key on disk. The token expiring
  overnight is the feature working.

### The edge and the bucket

- Private bucket plus Origin Access Control, rather than public static website
  hosting. See step 4 above.
- A bucket policy statement, `DenyUnencryptedTransport`, that refuses plain
  HTTP outright instead of only redirecting it.
- `BucketOwnerEnforced` ownership, AES256 with bucket keys, versioning on, and
  a lifecycle rule expiring noncurrent bundle versions after 30 days so old
  deploys do not accumulate storage forever.
- A response headers policy carrying a real Content Security Policy,
  `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`, HSTS with
  preload, `Cross-Origin-Opener-Policy`, and a `Permissions-Policy` that turns
  off camera, microphone, geolocation and payment.
- SPA routing handled by mapping 403 and 404 to `/index.html` with a 10 second
  error cache, so deep links work without a second origin.

### Operations

- X-Ray active tracing on the Lambda.
- Two CloudWatch alarms, one on Lambda errors and one on API 5xx, both
  `treat_missing_data = notBreaching` so an idle site does not alarm.
- Structured JSON access logging on the API stage with request id, latency,
  source IP and integration error message.
- Throttling at 25 requests per second sustained, 50 burst.
- arm64 Lambda at 256MB with a 5 second timeout, which is cheaper per
  millisecond than x86.
- 30 day log retention set explicitly, so logs do not bill forever by default.

### Process

- `scripts/verify.sh`, one command that runs every gate: toolchain versions
  against the CI pins, frontend lint and build, backend tests and ruff,
  `terraform fmt` and `validate` on both roots. Deliberately written without
  `set -e` so every gate reports instead of stopping at the first failure.
- `CLAUDE.md` holding the rules the code cannot state, including the pinned
  versions, the band alternation sequence and the copy rules.
- `BACKLOG.md` splitting work into mechanical, factual and judgment, so the
  items only a human can answer are not buried among the ones a script can.
- `scripts/apple-audit.mjs`, a Playwright script that reads computed styles off
  live Apple pages and diffs them against this site's design tokens.

---

## The official extensions

Six exist. They are not all worth the same to you.

| Extension | Verdict |
|---|---|
| **Terraform your Cloud Resume Challenge** | **Already done**, and it was the starting point rather than a conversion. Claim it, do not redo it |
| **Securing your software supply chain** | **Take this one.** It is the closest to the detection and response direction you want, and it is cheap: dependency scanning, pinned actions by commit SHA rather than tag, SBOM generation, and signing. You already have a `scan` job to hang it on. It also closes the open `npm audit` finding of 3 vulnerabilities, 2 high |
| **Real time visitor counter with WebSockets and DynamoDB Streams** | **Defer.** Genuinely interesting, and genuinely a rebuild of the API layer for a feature nobody reviewing a resume will notice. Revisit after the site is live and truthful |
| **Traditional web hosting on AWS** | **Skip for now.** VPC, load balancer, EC2. Worth doing once as a contrast piece, but it bills by the hour, which breaks the $0 property of this project |
| **Kubernetes Resume Challenge** | **Separate project, not an extension of this one.** You already have a Kubernetes artifact from WGU D339. If you want K8s on the resume, do it as its own repo |
| **Cloud Resume Challenge on DigitalOcean** | **Skip.** A second cloud adds breadth you are not being hired for yet |

---

## Ordered path to complete

Each step has one acceptance test. If two people could disagree about whether
it passed, it is not written tightly enough.

### Finish the launch

Done 14 November 2026, with one exception. The `production` environment has no
required reviewer yet, which waits on the repo being public.

| # | Do | Passes when |
|---|---|---|
| 1 | `aws sso login` | `aws sts get-caller-identity` returns the `AWSReservedSSO_AdministratorAccess` ARN |
| 2 | `brew install gh && gh auth login` | `gh auth status` reports logged in as `cruisethecity` |
| 3 | Fix M15 and M16, then one local `terraform apply` | `terraform output repository_variables` prints **ten** keys, not nine |
| 4 | L6, wire GitHub | `gh variable list` shows ten rows, and the `production` environment exists |
| 5 | L7, first CI deploy | Both workflows green, and `curl -o /dev/null -w '%{http_code}'` on the site URL returns 200 |
| 6 | Verify the counter | Two calls to `/visits` return a JSON integer, the second larger than the first |

### This week, make it true

The challenge never asks whether the claims on your resume are accurate. Your
own definition of done does, and it is the harder bar.

| # | Do | Passes when |
|---|---|---|
| 7 | F1, the "Under 60s" containment metric | The number is traceable to something you can show, or the claim is gone |
| 8 | F2, what the 77,959 KPI counts | The label on the site describes what the Splunk query actually counted |
| 9 | F4, the resume PDF | The file behind the download is your resume, not a 2 KB placeholder |
| 10 | J1, the honeypot screenshot | No placeholder panel title and no private address is visible in the image |
| 11 | Step 16, the reflection post | One post, linked from the site, about what this build taught you |
| 12 | L1, make the repo public | The repo loads signed out, and the required reviewer gate on `production` is enforced |

### Then, the two that cost money or time

| # | Do | Passes when |
|---|---|---|
| 13 | Step 6, custom domain | The domain serves the site over HTTPS on a valid ACM certificate, and `www` redirects to apex. Applied 14 November. Two parts remain: `www` serves the page instead of redirecting, and the CSP `connect-src` still uses the wildcard, which the `api_domain` output can replace |
| 14 | Supply chain extension | Actions pinned by commit SHA, dependency scan in CI, `npm audit` clean, SBOM published with each release |

---

## What any of this costs

| Item | Cost |
|---|---|
| Everything currently deployed, idle | **$0.50 per month**, which is the Route 53 hosted zone. Both DynamoDB tables are on demand, Lambda and API Gateway bill per request, the two alarms fit inside the always free ten, and the ACM certificate is free |
| Steps 1 through 12 above | $0.00 |
| Step 13, custom domain | About $16 per year for a `.com`, plus $0.50 per month for the Route 53 hosted zone. ACM certificates for CloudFront are free |
| Step 14, supply chain | $0.00. All of it is GitHub Actions and open source tooling |

The only recurring charges are the hosted zone and the yearly renewal of the
domain, which was bought on 13 November 2026.
