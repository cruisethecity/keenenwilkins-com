# Backlog

Last updated 2 October 2026.

## Definition of done

The site is live at a URL, every claim on it is true, and a stranger can verify
the top three claims in under five minutes.

All three currently fail. Nothing is deployed, several claims are unverified,
and there is nothing for a stranger to check.

---

## How this list works

Every item is one of three kinds, and the kind decides who does the work.

| Kind | Who decides | Why |
|---|---|---|
| **M** mechanical | Claude writes, CI enforces, KJ approves once | A command gives the same answer to anyone |
| **F** factual | **KJ only** | Claude has no way to learn the answer |
| **J** judgment | KJ decides, Claude argues both sides | No right answer, only tradeoffs |

The test for every acceptance criterion: **could a stranger run this and get
the same answer?** If two reasonable people could disagree about whether it
passed, it is not a criterion yet. Rewrite it until it has a number, a command,
or a yes/no fact in it.

Status values: `open`, `blocked`, `done`.

---

## Decide these first

These block launch, because the definition of done says every claim is true and
these are claims nobody has checked. None of them need code. They need an
answer from KJ.

- **F1** the "Under 60s" containment metric
- **F2** what the 77,959 KPI actually counts
- **F4** the resume PDF on the site is a 2 KB placeholder
- **J1** the honeypot screenshot

---

## L. Launch sequence

In dependency order. Full detail and per step cost in the launch runbook.

**L1 is the real bottleneck.** A Claude Code cloud session clones from GitHub,
so until the repo is pushed there are no cloud sessions to run, and the $100
cloud session credit sitting on the account expires 5 November unused.

| ID | Item | Acceptance criterion | Status |
|---|---|---|---|
| L1 | Put the repo in git and push to GitHub, public. **Gates everything, including cloud sessions** | `git log` shows a commit, `github.com/cruisethecity/keenenwilkins-com` returns 200, and `git status` shows no `.tfvars`, `backend.hcl` or `tfstate` tracked | open |
| L2 | New AWS account on the **Paid plan** | `aws sts get-caller-identity` returns the new account id, console shows Paid plan, and a CloudWatch billing alarm exists at $5 | open |
| L3 | Terraform proves out (see M1, M2) | Both roots pass `terraform validate` | open |
| L4 | Bootstrap remote state | `terraform output backend_config_snippet` prints, and `backend.hcl` exists with those values | blocked by L3 |
| L5 | First apply, local, `enable_custom_domain = false` | `terraform output site_url` returns a CloudFront hostname that serves the page over HTTPS | blocked by L4 |
| L6 | Wire GitHub | All ten repository variables set, `production` environment exists with KJ as required reviewer, and zero repository secrets | blocked by L5 |
| L7 | First CI deploy | Both workflows green on a push to `main`, site returns 200, telemetry badge shows a non zero count that increments on reload | blocked by L6 |
| L8 | Custom domain. Optional, last | Domain resolves over HTTPS with a valid ACM certificate and `www` redirects to apex | open |

---

## M. Mechanical

Claude writes these and CI enforces them. KJ approves the list once and then
stops thinking about them.

| ID | Criterion | Status |
|---|---|---|
| M1 | `terraform validate` exits 0 in `terraform/bootstrap` and `terraform/environments/prod`. **Has never run.** | open |
| M2 | `terraform fmt -check -recursive terraform` exits 0 | open |
| M3 | `pytest` passes 18 of 18 in `backend/` | passing as of 14 Sep |
| M4 | `npm run lint` exits 0 and `npm run build` succeeds | passing as of 14 Sep |
| M5 | `document.documentElement.scrollWidth - clientWidth === 0` at 390px and 1440px, after scrolling the full page | passing as of 14 Sep |
| M6 | Band background colors in document order contain no two adjacent equal values | passing as of 14 Sep |
| M7 | Every `repo` URL in `resumeData.json` returns HTTP 200 | open |
| M8 | Every `media.stem` in `resumeData.json` has matching `.webp` and `.png` files at every declared width in `public/media/` | open |
| M9 | No file in `public/media/` is unreferenced by `resumeData.json`. **Currently fails:** `s3-monitoring-800.webp`, `s3-monitoring-1600.webp` and `s3-monitoring-1600.png` are orphaned, pending F3 | open |
| M10 | No hyphen appears in any reader visible string in `resumeData.json`, any component string, any `alt` text, or `src/content/posts/*.md`. Scriptable, and worth scripting because this rule breaks silently | open |
| M11 | The counter endpoint returns a JSON integer that is larger on a second call | blocked by L5 |
| M12 | ~~Delete the empty `scripts/` directory~~ It now holds `apple-audit.mjs` | done |

---

## F. Factual

**Only KJ can answer these.** Claude cannot look any of them up. Every one is
currently a claim on a page that strangers will read, or a gap that stops a
claim from being made.

### F1. The "Under 60s" alert to containment metric
On the threat pipeline, front and center on the feature band.

Nobody has measured it. It is the single most impressive number on the site and
the one most likely to be asked about in an interview, which is the worst
combination for an unverified figure.

**Acceptance:** either a timestamp pair from a real alert and its containment
action that supports the number, or the metric is replaced with one that can be
supported, or removed.

**Status:** open. Blocks launch.

### F2. What the 77,959 KPI counts
Used in the stat rail as "events ingested from a live honeypot". The Splunk
panel is titled "Automation KPI (Big Number)", which is placeholder text, and
the attacker table beside it includes `10.0.1.123`, a private address, so at
least some of that traffic is internal rather than attacker.

The label is Claude's wording, not KJ's, and it has never been confirmed.

**Acceptance:** KJ states what that search actually counted, and the stat rail
label matches it exactly.

**Status:** open. Blocks launch.

### F3. Which project owns the S3 monitoring screenshot
Three files sit in `public/media/` referenced by nothing. The dashboard is
titled "AWS S3 Security Monitoring". It was never wired up because the question
was never answered.

**Acceptance:** either the files are referenced by exactly one project in
`resumeData.json` with alt text describing what the dashboard shows, or they
are deleted from the repo.

**Status:** open.

### F4. The resume PDF on the site is a placeholder
`frontend/public/resume/keenen-wilkins-resume.pdf` is **2,021 bytes**, one page,
generated by ReportLab on 2 September 2026. It is the empty stub created when
the project was scaffolded. It is not a resume.

That file is behind the "Download resume" button in the hero and in the sticky
product nav, which is the primary call to action on the page.

Separately, the real resume KJ shared in September links
`github.com/KeenenWilkins`, which is not the canonical account. Both problems
get fixed in the same pass.

**Acceptance:** the file at `public/resume/keenen-wilkins-resume.pdf` is the
real resume, it is larger than 20 KB, it links `github.com/cruisethecity`, and
its employment dates match `resumeData.json` exactly (Sazerac July 2022 to
August 2024, Zumiez December 2013 to December 2021).

**Status:** open. Blocks launch. Needs KJ to put the real PDF somewhere this
session can reach, or to drop it into `public/resume/` himself.

### F5. The i.c.stars bullets
Three bullets written from things KJ mentioned in conversation, not from
anything he wrote for publication. The three person team, the weekly dev.to
series, the guest speaker recaps.

**Acceptance:** KJ has read all three and either confirmed them or rewritten
them.

**Status:** open.

### F6. Two project tiles have no screenshot
LogVault and the Serverless Resume Platform. Both are shipped work with nothing
to look at, which is why they sit in the compact row.

**Acceptance:** either a screenshot exists at 1400px or wider for each, or KJ
decides the tiles stay text only, on the record.

**Status:** open.

### F7. Is "Phase 2 shipped" still true of the threat pipeline
Project status badges are read as current. The Splunk trial is gone, so some of
that work may now be past tense.

**Acceptance:** the status string on each project matches reality as of the
launch date.

**Status:** open.

### F8. Threat pipeline attribution
The detail line credits Kenny Barr with the Splunk detection engineering and
dashboards, KJ with the AWS infrastructure and Terraform.

**Acceptance:** Kenny has seen that sentence and is fine with it.

**Status:** open.

---

## J. Judgment

KJ decides. Claude's recommendation is noted, and is only a recommendation.

### J1. The honeypot screenshot
It sits beside the SecureAccess dashboard at identical size, and it loses the
comparison. Mostly empty, and the panel titles are still Splunk's placeholders:
"Automation KPI (Big Number)" and "Attacker Intel (Statistics Table)". The
Splunk trial is gone, so it cannot be reshot.

Options: crop tight so the attacker IP table fills the frame and the
placeholder headings fall outside it, move the tile to the compact row as text
only, or drop the project.

**Recommendation:** crop. The organic attacker data is the most distinctive
claim on the site and it should not be represented by a screenshot that looks
unfinished.

**Status:** open. Blocks launch.

### J2. The Self directed engineering entry
Covers August 2024 to now in the experience rail. With i.c.stars above it, it
reads as either honest continuity or as filler, depending on the reader.

**Recommendation:** keep it. Without it there is a two year gap between Sazerac
ending and i.c.stars starting, and an unexplained gap costs more than a modest
entry.

**Status:** open.

### J3. How close to Apple is close enough
Currently unbounded, which means it is not a criterion at all and will generate
churn forever.

**Next step:** `node scripts/apple-audit.mjs`. It loads Apple's flagship pages,
reads resolved computed styles, and diffs them against the `@theme` tokens in
`index.css`, writing `docs/apple-audit.md`. Resolved values, so our fluid
`clamp()` sizes are compared at a real viewport rather than as source text.

Run it where apple.com is reachable. Your Mac works. A cloud session works only
if that environment's network access allows apple.com, which the default
Trusted level does not.

**Acceptance:** `docs/apple-audit.md` exists, and the deltas worth acting on
have been copied into this file as numbered criteria with real numbers in
them. Then this item closes and does not reopen.

**Status:** open, script written and waiting to run.

### J4. A repo link on the Serverless Resume Platform tile
It is the only tile with no link, because the repo does not exist yet.

**Recommendation:** add it the moment L1 lands. The project claims to be this
page, so the repo is the proof.

**Status:** blocked by L1.

### J5. The headshot
The current portrait is adequate at the size it is used. KJ plans a
professional one eventually.

**Recommendation:** not a launch blocker. Revisit after the site is live.

**Status:** open.

---

## Out of scope

Recorded so they stop coming up.

- A tab switcher on the tech specs section. Apple uses tabs because nobody reads
  a spec sheet end to end. A hiring manager does. Hiding half the skills behind
  a click costs more than the polish gains.
- GitHub Pages as the destination. Fine as a staging link, wrong as the home,
  because the page claims AWS infrastructure in its footnotes and stat rail that
  Pages does not provide.
- Hotlinking Apple's CDN images, or using either of the Apple clone repos. Their
  assets rotate and one of them carries no license.
