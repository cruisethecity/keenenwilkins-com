# keenenwilkins-com

Cloud Resume Challenge, built as an Apple flagship product page. React SPA on a
private S3 bucket behind CloudFront, a Python Lambda counting visits in
DynamoDB, all of it provisioned by Terraform and deployed by GitHub Actions
over OIDC.

Owner: Keenen Wilkins (KJ). GitHub: `cruisethecity`.

The code is heavily commented and those comments explain the *why* of most
decisions. Read them. This file carries only what the code cannot tell you.

---

## Project state, October 2026

Read this before assuming anything works.

- **Not deployed.** No AWS resources exist yet. A brand new AWS account is being
  created for this.
- **`terraform validate` has never run.** The 32 `.tf` files were checked with an
  HCL parser only, which catches syntax and not provider schema. Treat the
  Terraform as unproven until it passes on this machine.
- **No domain.** Shipping on the CloudFront hostname. `enable_custom_domain`
  stays `false` until one is bought.
- **The resume PDF is a placeholder.** `public/resume/keenen-wilkins-resume.pdf`
  is a 2 KB ReportLab stub, and it is what the hero's download button serves.
- **See `BACKLOG.md`** for what is outstanding and who decides each item.

---

## Commands

Three gates. Run all three before claiming anything is done.

```bash
# frontend
cd frontend && npm ci && npm run lint && npm run build

# backend, 18 tests
cd backend && pip install -r requirements-dev.txt && pytest

# terraform, both roots
cd terraform && terraform fmt -check -recursive .
(cd bootstrap && terraform init -backend=false && terraform validate)
(cd environments/prod && terraform init -backend=false && terraform validate)
```

Other scripts: `npm run dev` (vite, port 5173), `npm run preview` (port 4173),
`npm run sync:blog` (refreshes `src/data/externalPosts.json` from the dev.to API).

`node scripts/apple-audit.mjs` measures apple.com's resolved computed styles and
diffs them against the `@theme` tokens, writing `docs/apple-audit.md`. Needs
playwright and a network that allows apple.com. See BACKLOG.md J3.

Pinned versions, from the workflows: Node 20, Python 3.11, Terraform 1.13.3.

---

## Hard rules

### No hyphens in readable English

Every word of copy a visitor can read is written without hyphens. Date ranges
use the word "to". Hyphens are allowed only inside code, identifiers, URLs and
class names.

This applies to `src/data/resumeData.json`, every string in a component, every
`alt` attribute, and the markdown in `src/content/posts/`. It is the rule most
likely to get broken silently, because hyphenating is the default instinct.

Wrong: "multi-signal threat scoring", "2022 - 2024", "self-directed"
Right: "multi signal threat scoring", "July 2022 to August 2024", "self directed"

### Claims and reality move together

The page makes specific, checkable claims about its own infrastructure: the
hero footnote, the stat rail, and footnotes 1 through 3 in the footer. If the
deploy changes, the copy has to change in the same commit, and the reverse.

A claim on this page that is not true is worse than no claim, because the
audience for this site is people who check.

---

## The design system

`src/index.css` is the whole thing, and its comments carry the detail. Two
rules that are easy to break from outside that file:

**Band tone alternation.** The page is a stack of full bleed bands that
alternate page white, section gray and pure black. No two adjacent bands may
share a tone. Current order, set in `App.jsx`:

```
dark  gray  light  dark  light  gray  light  gray  dark  gray
```

Adding or reordering a section means rechecking this sequence.

**Never hardcode a color on content.** A band sets its own semantic colors
through CSS custom properties. Content inside uses the tone aware classes
(`band-ink`, `band-muted`, `band-faint`, `band-link`, `band-rule`,
`band-rule-soft`, `band-card`, `band-chip`, `band-signal`) so the same
component renders correctly on white, gray or black.

**Tile size follows content, it is not assigned.** `ProLineup` groups projects
by whether they have a screenshot, which is what keeps rows self levelling. Do
not reintroduce per project span classes.

---

## Verification discipline

**Never claim a visual change works without rendering it.** This is not
optional and it is not pedantry. Two real bugs in this repo would both have
passed a careful code read:

- The entire bento grid sat at `opacity: 0` in production. Motion's
  `viewport.amount` is a percentage of the *element*, not the viewport, and a
  1742px grid can never show 25 percent of itself on a 900px screen.
- The feature band's sticky pin opened a dead gap under the metrics, because
  the pinned composition was taller than the viewport.

The loop that catches these: build, serve `dist`, load it in headless Chromium,
then check console errors, `scrollWidth - clientWidth` at 390 and 1440, and the
computed styles of whatever you changed. Scroll the page before measuring, or
reveal animations will not have fired.

---

## Known traps

- **Motion `viewport.amount` is element relative.** Use `REVEAL_VIEWPORT` for
  single elements and `REVEAL_VIEWPORT_CONTAINER` (`amount: "some"`) for tall
  stagger containers. See the comment in `src/lib/motion.js`.
- **Unlayered CSS beats `@layer`,** regardless of source order. A host page that
  injects an unlayered `body` reset will win over anything in `@layer base`.
- **lucide-react v1 dropped the brand marks.** GitHub and LinkedIn are local SVG
  components in `src/lib/icons.jsx`. The registry there is module private;
  every call site goes through `<Glyph name="..." />`.
- **Vite's `manualChunks` must be function form.** The object shorthand is a
  Rollup convenience that the Rolldown based bundler rejects.
- **CSS grid and flex children default to `min-width: auto`,** so a wide `<pre>`
  or table pushes the page sideways instead of scrolling inside its own box.
- **Terraform first apply has to be local.** CI authenticates with IAM roles
  that the apply creates, so it cannot bootstrap itself.

---

## Content sources

- `src/data/resumeData.json` is all site copy. Editing copy means editing this.
- `src/data/externalPosts.json` is generated by `npm run sync:blog` from
  dev.to. Hand written `summary` fields survive a resync. Do not copy post
  bodies into this repo, dev.to stays canonical.
- `src/content/posts/*.md` are posts written for this site only.
- `public/media/` holds every screenshot. Each entry in `resumeData.json`
  references a `stem` plus widths, and `ImageFrame` builds the srcset from
  those. A stem with no matching files renders a broken image with no warning.

---

## Deploy

Two workflows, both on path filters, both OIDC only with no stored AWS keys.

- `frontend-deploy.yml` builds, syncs `dist` to S3 in two passes so
  fingerprinted assets get a one year immutable cache and `index.html` does
  not, invalidates CloudFront, and waits for the invalidation.
- `backend-deploy.yml` runs pytest, then fmt check and Checkov, then
  `terraform plan` under a read only role, then waits on the `production`
  environment approval before an apply role touches anything.

Ten repository variables drive both. `terraform output repository_variables`
prints them all.
