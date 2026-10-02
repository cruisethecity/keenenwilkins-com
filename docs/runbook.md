# Runbook

Everything below assumes an Apple silicon Mac and zsh. Commands are copy and paste safe from the repository root.

## Phase 0. Toolchain

```bash
# Homebrew is already installed on this machine.
brew install node python@3.11 terraform awscli gh jq

node --version         # expect v20 or newer
python3.11 --version   # expect 3.11.x, matching the Lambda runtime
terraform version      # expect 1.9 or newer
aws --version
```

Terraform can also be installed through `tfenv` if you want to pin versions per project. The pipeline pins 1.13.3, so matching it locally avoids a state file written by a newer minor version than CI runs.

## Phase 1. AWS credentials for the first apply

The pipeline uses OIDC and holds no keys, but the roles that make OIDC work have to be created by something. That something is you, once, from your laptop.

```bash
aws configure sso            # preferred
# or, if this account has no Identity Center:
aws configure --profile resume

export AWS_PROFILE=resume
aws sts get-caller-identity  # confirm the account id before going further
```

## Phase 2. Bootstrap the state backend

```bash
cd terraform/bootstrap
terraform init
terraform apply
```

Two resources are created: a versioned, encrypted S3 bucket for state, and a DynamoDB table for locking. Both carry `prevent_destroy`, so a stray `terraform destroy` cannot take your state with it.

Save the outputs:

```bash
terraform output backend_config_snippet
```

## Phase 3. Configure the production root

```bash
cd ../environments/prod

cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars
```

Edit `backend.hcl` with the bucket and table names from phase 2. Edit `terraform.tfvars` and set at minimum:

```hcl
github_repository = "cruisethecity/keenenwilkins-com"
state_bucket_name = "cloud-resume-tfstate-<your account id>"
```

Then initialize and plan:

```bash
terraform init -backend-config=backend.hcl
terraform fmt -recursive ../..
terraform validate
terraform plan
```

Read the plan. There should be roughly forty resources and no deletions.

```bash
terraform apply
```

CloudFront takes five to fifteen minutes to reach a deployed state on first creation. The apply will sit on that resource. That is normal.

## Phase 4. Capture the outputs

```bash
terraform output repository_variables
terraform output site_url
terraform output counter_url
```

Smoke test the backend before touching the frontend:

```bash
COUNTER=$(terraform output -raw counter_url)
SITE=$(terraform output -raw site_url)

# should return 200 with a count
curl -i -H "Origin: ${SITE}" "${COUNTER}"

# should return 200 with the count incremented by one
curl -i -X POST -H "Origin: ${SITE}" "${COUNTER}"

# should return 403, because the origin is not on the allowlist
curl -i -H "Origin: https://not-my-site.example" "${COUNTER}"
```

If the third command returns 200 instead of 403, the allowlist is wrong. Check `terraform output cors_allowed_origins`.

## Phase 5. Wire up GitHub

Create the repository and push:

```bash
cd ../../..
git init
git add .
git commit -m "Apple styled cloud resume: frontend, backend, terraform, pipelines"
gh repo create keenenwilkins-com --public --source=. --push
```

Set the repository variables from the `repository_variables` output. These are variables, not secrets, because none of them are sensitive:

```bash
gh variable set AWS_REGION                 --body "us-east-1"
gh variable set AWS_FRONTEND_ROLE_ARN      --body "<frontend role arn>"
gh variable set AWS_PLAN_ROLE_ARN          --body "<plan role arn>"
gh variable set AWS_APPLY_ROLE_ARN         --body "<apply role arn>"
gh variable set S3_BUCKET                  --body "<bucket name>"
gh variable set CLOUDFRONT_DISTRIBUTION_ID --body "<distribution id>"
gh variable set VITE_API_BASE_URL          --body "<api base url>"
gh variable set VITE_SITE_URL              --body "<site url>"
gh variable set TF_STATE_BUCKET            --body "<state bucket>"
gh variable set TF_LOCK_TABLE              --body "<lock table>"
```

### The manual approval gate

This step is not optional. Without it the backend pipeline applies without asking.

1. Open the repository on GitHub, then Settings, Environments.
2. New environment, named exactly `production`.
3. Tick Required reviewers and add yourself.
4. Save.

The apply job declares `environment: production`, so from now on it pauses for approval. The apply role's trust policy also only accepts the `production` environment claim, so a run that skips the gate never receives credentials.

## Phase 6. Local frontend development

```bash
cd frontend
npm ci

cp .env.example .env.local
# set VITE_API_BASE_URL to the api_base_url terraform output

npm run dev      # http://localhost:5173
npm run lint
npm run build
npm run preview  # serves the production build on 4173
```

`http://localhost:5173` is on the API allowlist by default, so the telemetry badge goes green against the real DynamoDB counter while you are developing. Set `allow_local_development_origin = false` in tfvars and reapply when you are done iterating.

If the badge reads "Telemetry not configured", `VITE_API_BASE_URL` was empty at build time. Vite inlines that value during the build, so it has to be set before `npm run build`, not at runtime.

## Phase 7. Backend development

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

pytest -v
pytest --cov=visitor_counter --cov-report=term-missing
ruff check src tests
```

Eighteen tests, no AWS account needed. `moto` intercepts every boto3 call.

## Phase 8. First deploy through the pipeline

```bash
git checkout -b first-deploy
git commit --allow-empty -m "Trigger the pipelines"
git push -u origin first-deploy
gh pr create --fill
```

On the pull request you should see the test job, the scan job, and a plan posted as a comment. No apply job runs, because the apply is gated on main.

Merge, then watch:

```bash
gh run watch
```

The backend workflow will pause at the apply job waiting for your approval. The frontend workflow builds and syncs without a gate.

## Phase 9. Add the real content

1. Replace `frontend/public/resume/keenen-wilkins-resume.pdf` with your real resume, same file name.
2. Fix the two placeholder date ranges in `frontend/src/data/resumeData.json`. See `docs/CONTENT-TODO.md`.
3. Drop new write ups into `frontend/src/content/posts/` as markdown files with frontmatter. They appear in the newsroom automatically, newest first.

## Phase 10. Attach a custom domain later

Nothing in the stack has to change. Buy the domain, create the hosted zone, then:

```hcl
enable_custom_domain      = true
hosted_zone_name          = "keenenwilkins.com"
domain_name               = "keenenwilkins.com"
subject_alternative_names = ["www.keenenwilkins.com"]
```

```bash
terraform apply
```

That single apply requests the certificate in us-east-1, writes the DNS validation records, waits for issuance, attaches the certificate to the distribution, adds the alternate domain names, and creates the alias records. Then update the `VITE_SITE_URL` repository variable and rerun the frontend workflow so the smoke test checks the new hostname.

---

## Troubleshooting

**`Error: creating IAM OIDC Provider: EntityAlreadyExists`**
Another project in this account already created the GitHub provider. Set `create_oidc_provider = false` in tfvars and reapply.

**`Not authorized to perform sts:AssumeRoleWithWebIdentity`**
The subject claim does not match the trust policy. Run `terraform output -json` and look at `github_oidc.allowed_subjects`, then compare it to the run's actual claim in the workflow log. Nine times out of ten the branch is not `main`, or the `production` environment name has a typo.

**`Error: Invalid identity token`**
The workflow is missing `permissions: id-token: write`.

**The counter returns 403 from the real site**
The site origin is not on the allowlist. Check `terraform output cors_allowed_origins`. After changing the distribution, the CloudFront hostname changes and the Lambda environment variable needs a reapply.

**A deploy succeeded but the site still shows the old build**
The invalidation is created and waited on, so this is almost always browser cache on `index.html`. Confirm with `curl -I <site url>` and check the `cache-control` header reads `max-age=0, must-revalidate`. If it reads a long max age, the two sync commands ran in the wrong order or the excludes are wrong.

**`terraform plan` hangs on acquiring the state lock**
A previous run died holding the lock. Confirm nothing is actually running, then `terraform force-unlock <lock id>`.

**The bento tiles never fade in**
A stagger container needs `amount: "some"` in its viewport config. A percentage threshold is a percentage of the element, and a container taller than the viewport can never satisfy 25 percent. See `frontend/src/lib/motion.js`.
