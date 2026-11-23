# keenenwilkins.com

Live at [keenenwilkins.com](https://keenenwilkins.com).

My build of the [AWS Cloud Resume Challenge](https://cloudresumechallenge.dev/docs/the-challenge/aws/). A single page React resume served from a private S3 bucket through CloudFront, with a Python visitor counter on Lambda and DynamoDB. The infrastructure is modular Terraform, and GitHub Actions deploys it over OpenID Connect with no stored AWS credentials.

**Keenen Wilkins.** Cloud Architecture and DevSecOps. Kansas City, Missouri.
[Site](https://keenenwilkins.com) · [GitHub](https://github.com/cruisethecity) · [LinkedIn](https://www.linkedin.com/in/keenenw)

---

## Where to look first

| To see | Open |
| --- | --- |
| How CI signs in to AWS with no keys | [terraform/modules/github_oidc](terraform/modules/github_oidc) |
| The private bucket, CloudFront and the security headers | [terraform/modules/static_site](terraform/modules/static_site) |
| The counter, and why two visits at once cannot lose a count | [backend/src/visitor_counter/handler.py](backend/src/visitor_counter/handler.py) |
| Both pipelines | [.github/workflows](.github/workflows) |
| All sixteen challenge steps, scored against this repo | [CHALLENGE.md](CHALLENGE.md) |
| Diagrams and the resource inventory | [docs/architecture.md](docs/architecture.md) |
| Local setup through first deploy | [docs/runbook.md](docs/runbook.md) |

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19 on Vite 8 | Fast build, native ES modules, fingerprinted assets |
| Styling | Tailwind CSS 4 | Design tokens live in CSS, no config file to drift |
| Motion | Motion (Framer Motion) | One easing curve, scroll reveals, reduced motion respected |
| Icons | Lucide React | Tree shaken through an explicit registry |
| Content | Local markdown | Parsed at build time, sanitized with DOMPurify |
| API | API Gateway HTTP API | Cheaper than a REST API for a proxy integration |
| Compute | Lambda, Python 3.11, arm64 | Graviton pricing, no native wheels needed |
| Data | DynamoDB on demand | Atomic `ADD` increment, no lost updates |
| Delivery | CloudFront with Origin Access Control | Bucket stays fully private |
| IaC | Terraform, six modules | Remote state in S3, locked in DynamoDB |
| CI/CD | GitHub Actions with OIDC | Zero long lived credentials |
| Tests | pytest and moto | Eighteen tests, no AWS account required, 90 percent coverage floor in CI |

## Layout

```
keenenwilkins-com/
├── .github/workflows/        frontend deploy, backend test, plan and apply
├── backend/
│   ├── src/visitor_counter/  the Lambda: atomic increment, strict CORS, JSON logs
│   └── tests/                18 tests with pytest and moto
├── frontend/
│   ├── public/               images, the link preview card, the resume PDF
│   ├── scripts/              pulls dev.to posts into the newsroom data
│   └── src/
│       ├── components/       one file per page section
│       ├── content/posts/    the newsroom write ups, in markdown
│       ├── data/             resumeData.json, the resume content in one file
│       ├── hooks/            the session guarded counter fetch
│       └── index.css         the design tokens
├── scripts/
│   ├── verify.sh             every local gate in one command
│   ├── build-resume.mjs      prints the resume PDF from resumeData.json
│   ├── build-og.mjs          draws the link preview card
│   └── apple-audit.mjs       measures Apple's live pages against this site
├── terraform/
│   ├── bootstrap/            state bucket and lock table, run once
│   ├── environments/prod/    the composition root
│   └── modules/              acm, dns, dynamodb, github_oidc, lambda_api, static_site
└── docs/                     architecture, runbook, the design audit
```

## Quick start

Full detail lives in [docs/runbook.md](docs/runbook.md). The short version:

```bash
# 1. state backend, once
cd terraform/bootstrap && terraform init && terraform apply

# 2. the stack
cd ../environments/prod
cp backend.hcl.example backend.hcl        # fill in the bootstrap outputs
cp terraform.tfvars.example terraform.tfvars
terraform init -backend-config=backend.hcl
terraform apply

# 3. the site
cd ../../../frontend
npm ci
echo "VITE_API_BASE_URL=$(cd ../terraform/environments/prod && terraform output -raw api_base_url)" > .env.local
npm run dev
```

## Security posture

- The S3 bucket is fully private. Public access is blocked at the bucket level, and the bucket policy grants `s3:GetObject` to the CloudFront service principal only when the request carries this distribution's ARN.
- HTTPS is enforced. A bucket policy statement denies all S3 actions when `aws:SecureTransport` is false.
- Security headers are set at the edge: HSTS with preload, a Content Security Policy that starts from `default-src 'none'`, frame options deny, a referrer policy and a permissions policy.
- The Lambda's data access is two DynamoDB actions, `GetItem` and `UpdateItem`, on one table.
- The CORS allowlist is exact. An unrecognized origin gets a 403, not a missing header.
- API Gateway is throttled to 25 requests per second with a burst of 50.
- CI authenticates by OIDC. Trust policies pin the repository, the branch and the environment. Plan and apply use different roles, and the plan role is read only.
- The apply role's IAM permissions are confined to a resource name prefix, with an explicit deny on user and access key creation that no allow can override.
- Markdown is sanitized with DOMPurify before it reaches the DOM, even though every file is local.

## Design notes

**No hyphens in readable copy.** A deliberate constraint on this build. Every sentence on the page uses commas, periods, or a rewrite, and date ranges use the word "to". Hyphens appear only in code, paths and class names.

**One easing curve.** `cubic-bezier(0.16, 1, 0.3, 1)`, applied at three amplitudes.

**Measured, not eyeballed.** `scripts/apple-audit.mjs` reads the computed styles off Apple's live product pages and compares them with this site's tokens. [docs/apple-audit.md](docs/apple-audit.md) records what changed as a result.

## Cost

About fifty cents a month when idle, which is the Route 53 hosted zone, plus the yearly renewal of the domain. DynamoDB on demand and Lambda both round to nothing at this volume, and CloudFront's free tier covers the requests.
