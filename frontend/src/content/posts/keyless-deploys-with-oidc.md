---
title: Why this site holds no AWS access keys
date: 2026-09-01
category: DevSecOps
summary: GitHub Actions deploys every part of this stack and there is not one AWS credential stored in the repository. Here is how the OpenID Connect trust actually works and the two mistakes that make it insecure anyway.
tags: [OIDC, IAM, GitHub Actions, STS]
---

The fastest way to wire a pipeline to AWS is to create an IAM user, generate an access key, and paste the pair into repository secrets. It works in ten minutes. It also creates a credential that never expires, lives in a system you do not control, and grants the same access at three in the morning eighteen months from now as it does today.

Nobody rotates those keys. I have never once seen it happen on a schedule.

OpenID Connect removes the credential entirely.

## What actually happens on a deploy

When a workflow runs, GitHub can mint a signed JSON Web Token describing that specific run. The token says which repository it came from, which branch or environment, which workflow file, and who triggered it. It is signed by GitHub and it is valid for minutes.

The workflow hands that token to AWS STS and asks to assume a role. AWS fetches GitHub's public signing keys, verifies the signature, checks the claims inside the token against the role's trust policy, and if everything matches it returns temporary credentials that expire in an hour.

```yaml
permissions:
  contents: read
  id-token: write   # without this the token is never minted

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::111122223333:role/cloud-resume-gha-frontend-deploy
      aws-region: us-east-1
```

That is the whole change on the workflow side. No secrets block.

The `id-token: write` permission is the part people miss. Leave it out and the action fails with an invalid identity token error that reads like a trust policy problem, so you go and edit the trust policy, which is the wrong file.

## The mistake that undoes all of it

Here is a trust policy that looks fine and is not:

```json
{
  "Condition": {
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:*"
    }
  }
}
```

The wildcard covers every subject claim that repository can produce. That includes `pull_request` runs. Anyone who opens a pull request against the repository, from a fork, can add a step to the workflow in that pull request, assume the role, and act inside the account with whatever permissions the role carries.

The fix is to name the refs you trust:

```hcl
condition {
  test     = "StringLike"
  variable = "token.actions.githubusercontent.com:sub"
  values = [
    "repo:cruisethecity/keenenwilkins-com:ref:refs/heads/main",
    "repo:cruisethecity/keenenwilkins-com:environment:production",
  ]
}
```

Now only a run on the main branch, or a run that has already passed a protected environment gate, can get credentials at all.

The second condition matters just as much and is easy to forget:

```hcl
condition {
  test     = "StringEquals"
  variable = "token.actions.githubusercontent.com:aud"
  values   = ["sts.amazonaws.com"]
}
```

Without the audience check the role will accept a GitHub token that was minted for a different audience entirely.

## One role per job, not one role per pipeline

The temptation is a single deploy role that can do everything, because that role always works and you stop debugging permissions. This stack uses three.

| Role | Trusted for | Can do |
| --- | --- | --- |
| frontend deploy | main branch | Write to one bucket, invalidate one distribution |
| backend plan | main branch and pull requests | Read only across the account, plus state locking |
| backend apply | production environment only | Create and modify project resources |

The plan role holds `ReadOnlyAccess` and nothing else beyond the state bucket. That means a `terraform plan` running on a pull request physically cannot change infrastructure, no matter what the workflow file in that pull request says. The apply role is trusted only for the production environment claim, so the credentials that can change things do not exist until a reviewer has clicked approve.

That separation is the difference between a pipeline that is convenient and a pipeline you would put in front of an auditor.

## The apply role still needs a fence around IAM

A Terraform apply role has to be able to create IAM roles, because the stack contains IAM roles. Left wide open, that single permission turns the role into an administrator: create a role with full access, attach it to something, assume it.

Two guardrails keep it honest. Confine IAM writes to a name prefix the project owns:

```hcl
resources = [
  "arn:aws:iam::111122223333:role/cloud-resume-*",
]
```

Then add an explicit deny that no allow statement can override:

```hcl
statement {
  effect = "Deny"
  actions = [
    "iam:CreateUser",
    "iam:CreateAccessKey",
    "iam:CreateLoginProfile",
  ]
  resources = ["*"]
}
```

An explicit deny always wins in IAM evaluation. Even if a future policy edit grants those actions somewhere else on this role, the deny holds.

## What this buys you

There is nothing in the repository to leak. There is nothing to rotate. Every action taken in the account traces back through CloudTrail to a role session name that contains the workflow run id, so a strange API call in the log leads to an exact commit and an exact person.

It took maybe an extra hour over pasting an access key. It is the single highest leverage hour in this whole build.
