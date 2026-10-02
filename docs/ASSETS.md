# Images to send, and exactly where they go

The page is currently all typography. Apple's pages are mostly photography. That single difference is why this reads as Apple styled rather than as Apple, and it is the highest leverage thing left to change.

Everything below is optional and independent. Send one item or all of them, in any order, and I will wire each into the build.

---

## Priority 1. Project screenshots

**Why this first.** Apple's product tiles hold product photos. Your equivalent is a screenshot of the thing you actually built. These are the only images on the page that make a hiring manager stop scrolling, and they are entirely yours, with no licensing question attached.

Send one per project, six total if you have them:

| Project | The shot worth taking |
| --- | --- |
| Enterprise DevSecOps Threat Pipeline | The five panel Splunk dashboard, dark theme, full window |
| SecureAccess Audit Dashboard | The scored session list, with a few high risk rows visible |
| AWS Incident Response Honeypot | A Splunk panel showing real attack source geography or a spike |
| Serverless Resume Platform | The CloudFront distribution page, or a green Actions run with the approval gate |
| RHEL LogVault Automation | A terminal running the collection with `systemctl status` output |
| AI Ticket Triage Agent | Whatever exists now, even mid build |

**Specs**

- PNG or JPG, at least 2400 pixels wide. Bigger is fine, I will generate the responsive sizes.
- Landscape, roughly 16 by 10 or 16 by 9. Portrait screenshots fight the tile shape.
- Dark UI screenshots land in the black lineup band and look best there. Light UI screenshots go to the gray bands.
- Full window, not a cropped fragment. The chrome around a dashboard is part of what makes it read as real.
- macOS shortcut: `Shift Command 4`, then `Space`, then click the window. That captures one window cleanly with a shadow.

**Redact before sending.** This matters more for you than for most people, because a security portfolio gets read by security people. Scrub or blur:

- Public IP addresses and hostnames
- AWS account IDs and full ARNs
- Access key IDs, even expired ones
- Any customer, employer or third party name or data
- Internal URLs and Slack or Discord webhook paths

Private RFC1918 addresses like `10.x` and `192.168.x` are fine to leave visible. Attacker source IPs from the honeypot are fine too, and arguably the point.

---

## Priority 2. A headshot

Apple has no headshots, but a resume is not a product page, and a face at the closing call to action measurably raises reply rates.

**Specs**

- One image, at least 1600 by 1600, square crop or loose enough that I can crop square.
- Plain seamless background. Near black or light gray both work, because they match the two band grounds. A busy background is the thing that makes a headshot look pasted on.
- Shoulders up, eyes to camera, even light, no heavy filter.
- A phone in portrait mode against a blank wall in window light beats a cheap studio photo. If you have a recent one you already like, send that rather than staging a new one.

**Where it lands.** A round 96 pixel portrait in the closing contact band, beside the headline. Not in the hero. The hero belongs to the headline.

---

## Priority 3. Architecture diagrams as images

You already have three Mermaid diagrams in `docs/architecture.md`. Rendering them as dark background PNGs and dropping them into the featured bento tile and the newsroom articles would be strong, and it is work I can do without anything from you. Say the word.

---

## Priority 4. An Open Graph preview card

Right now `index.html` declares a Twitter card with no image, so every link you paste into LinkedIn or Slack previews as a blank rectangle.

**Specs**

- 1200 by 630 exactly. Any other ratio gets cropped unpredictably.
- Your name, the discipline line, and nothing else. Text has to be legible at 300 pixels wide.
- I can generate this from the design system rather than you making it, if you would rather not.

---

## What not to send

Generic stock photography. Server rooms with blue lighting, hands on keyboards, glowing cloud icons, padlocks over circuit boards. It is the single fastest way to make a technical portfolio look generic, and every reviewer has seen the same twelve images. A page with no photos reads better than a page with stock photos.

If you want visual texture without subject matter, abstract gradient renders or a subtle noise field are safe. I can generate those in code with no asset at all.

---

## How to send them

Attach them to the chat, or drop them into `~/Documents/keenenwilkins-com/frontend/public/media/` and tell me. I will handle the rest: AVIF and WebP conversion, a `srcset` per breakpoint, aspect ratio boxes so nothing shifts as images load, lazy loading below the fold, and eager loading for anything in the first screen.

Two things are already in place for this. The Content Security Policy allows `img-src 'self' data:`, so self hosted images work with no Terraform change. And the deploy workflow marks everything under `assets/` immutable for a year, so images are fetched once per visitor and then cached at the edge.
