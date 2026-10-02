# Apple styled Cloud Resume

A single page React resume in Apple's flagship product page design language, served from a private S3 bucket through CloudFront, with a Python serverless visitor counter, provisioned entirely by modular Terraform and deployed by GitHub Actions with no AWS access keys anywhere.

Built as an upgraded take on the sixteen step AWS Cloud Resume Challenge.

**Keenen Wilkins.** Cloud Architecture and DevSecOps. Kansas City, Missouri.
[GitHub](https://github.com/cruisethecity) · [LinkedIn](https://www.linkedin.com/in/keenenw)

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 19 on Vite 8 | Fast build, native ES modules, fingerprinted assets |
| Styling | Tailwind CSS 4 | Design tokens live in CSS, no config file to drift |
| Motion | Motion (Framer Motion) | One easing curve, scroll reveals, reduced motion respected |
| Icons | Lucide React | Tree shaken through an explicit registry |
| Content | Local markdown | Parsed at build time, sanitized with DOMPurify |
| API | API Gateway HTTP API | A third of the cost of a REST API for a proxy integration |
| Compute | Lambda, Python 3.11, arm64 | Graviton pricing, no native wheels needed |
| Data | DynamoDB on demand | Atomic `ADD` increment, no lost updates |
| Delivery | CloudFront with OAC | Bucket stays fully private |
| IaC | Terraform, six modules | Remote state in S3, locked in DynamoDB |
| CI/CD | GitHub Actions with OIDC | Zero long lived credentials |
| Tests | pytest and moto | Eighteen tests, no AWS account required |

## Layout

```
keenenwilkins-com/
├── .github/workflows/
│   ├── frontend-deploy.yml       build, sync to S3, invalidate CloudFront
│   └── backend-deploy.yml        pytest, checkov, plan, gated apply
│
├── backend/
│   ├── src/visitor_counter/
│   │   ├── __init__.py
│   │   └── handler.py            atomic increment, strict CORS, JSON logs
│   ├── tests/
│   │   └── test_handler.py       18 tests across happy path, CORS, failures
│   ├── pyproject.toml            pytest and ruff configuration
│   ├── requirements.txt          empty on purpose, boto3 ships in the runtime
│   └── requirements-dev.txt
│
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── resume/               drop the real PDF here
│   ├── src/
│   │   ├── components/
│   │   │   ├── primitives/
│   │   │   │   ├── Reveal.jsx            scroll reveal wrapper
│   │   │   │   └── Section.jsx           eyebrow, headline, lede shell
│   │   │   ├── GlassHeader.jsx           sticky bg-black/75 nav
│   │   │   ├── TelemetryBadge.jsx        pulsing dot, live DynamoDB count
│   │   │   ├── ScrollProgress.jsx        spring smoothed progress line
│   │   │   ├── HeroStage.jsx             parallax hero, fluid display type
│   │   │   ├── HighlightRail.jsx         oversized stat tiles
│   │   │   ├── ProLineup.jsx             bento grid of projects
│   │   │   ├── TechSpecs.jsx             Apple specification table
│   │   │   ├── ExperienceRail.jsx        timeline
│   │   │   ├── CredentialWall.jsx        certifications and education
│   │   │   ├── Newsroom.jsx              markdown post index
│   │   │   ├── ArticleReader.jsx         sanitized article view
│   │   │   ├── ContactBand.jsx           closing call to action
│   │   │   └── SiteFooter.jsx
│   │   ├── content/posts/*.md            the newsroom, three write ups
│   │   ├── data/resumeData.json          all resume content, one file
│   │   ├── hooks/useVisitorCount.js      session guarded counter fetch
│   │   ├── lib/
│   │   │   ├── icons.jsx                 explicit icon registry
│   │   │   ├── markdown.js               frontmatter, marked, DOMPurify
│   │   │   └── motion.js                 easing and variant vocabulary
│   │   ├── App.jsx                       hash routing between the two views
│   │   ├── main.jsx
│   │   └── index.css                     the design system
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── terraform/
│   ├── bootstrap/                state bucket and lock table, run once
│   ├── environments/prod/        the composition root
│   │   ├── backend.tf            partial S3 backend config
│   │   ├── main.tf               wires the modules together
│   │   ├── providers.tf          default region plus us-east-1 alias
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars.example
│   └── modules/
│       ├── acm/                  certificate in us-east-1, DNS validated
│       ├── dns/                  Route 53 alias records
│       ├── dynamodb/             counter table
│       ├── github_oidc/          provider plus three scoped CI roles
│       ├── lambda_api/           function, role, HTTP API, alarms
│       └── static_site/          private bucket, OAC, CloudFront, headers
│
└── docs/
    ├── architecture.md           Mermaid diagrams and resource inventory
    ├── runbook.md                local setup through first deploy
    └── CONTENT-TODO.md           what to verify before publishing
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

## Design notes

**No hyphens in readable copy.** A deliberate constraint on this build. Every sentence on the page uses commas, periods, or a rewrite, and date ranges use the word "to". Hyphens appear only in code, paths and class names.

**One easing curve.** `cubic-bezier(0.16, 1, 0.3, 1)`, applied at three amplitudes. That single constraint is most of what separates a page that feels designed from one that feels decorated.

**Fluid display type.** The headline is `clamp(2.75rem, 9vw, 7.5rem)` with negative letter spacing. At display sizes, default tracking looks loose, which is why every Apple headline sits near minus four percent.

**Glass, properly.** A translucent fill, a backdrop blur with saturation so color bleeds through, and a one pixel top highlight. Missing any of the three gives you a gray box.

## Security posture

- S3 bucket is fully private. Public access blocked at the bucket level, and the bucket policy grants `s3:GetObject` to the CloudFront service principal only when the request carries this distribution's ARN.
- HTTPS enforced. A bucket policy statement denies all S3 actions when `aws:SecureTransport` is false.
- Security headers set at the edge: HSTS with preload, a Content Security Policy with `default-src 'none'`, frame options deny, referrer policy, permissions policy.
- Lambda execution role holds two DynamoDB actions on one table ARN and nothing else. No managed policies, no wildcard resources.
- CORS allowlist is exact. An unrecognized origin gets a 403, not a missing header.
- API Gateway throttled to twenty five requests per second with a burst of fifty.
- CI authenticates by OIDC. Trust policies pin the repository, the branch and the environment. Plan and apply use different roles.
- The apply role's IAM permissions are confined to a resource name prefix, with an explicit deny on user and access key creation that no allow can override.
- Markdown is sanitized with DOMPurify before it reaches the DOM, even though every file is local.

## Cost

Under one dollar a month at portfolio traffic. DynamoDB on demand and Lambda both round to nothing at this volume, CloudFront's free tier covers the requests, and the bucket holds a few hundred kilobytes. The largest line item is Route 53 at fifty cents per hosted zone, and that only exists once a custom domain is switched on.
