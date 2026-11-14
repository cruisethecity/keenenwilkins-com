# apple.com audit

Measured 13 November 2026 at 1440 by 900.

A snapshot to decide against, not a target to chase. Apple ships redesigns on
their schedule, and one of the three pages this audit used to default to has
already turned into something else.

## How it was measured

Apple's side was read out of a real browser on each live page: resolved
computed styles, not authored CSS, because their type is fluid and a `clamp()`
tells you nothing without a viewport.

| Page | What it is today |
|---|---|
| `/iphone-18-pro/` | Dark flagship. The newest template |
| `/ipad-pro/` | Dark flagship, centered hero |
| `/macbook-air/` | Light flagship |
| `/macbook-pro/` | **No longer a product page.** It is now a two model chooser, 3,566 pixels tall, with almost nothing to measure |

This site was measured from a production build in headless Chromium at 1440
and at 390, before and after the changes, with the same probe.

## What changed

| Property | Apple, measured | This site before | This site after |
|---|---|---|---|
| Largest type on the page | 96 over 100 | 104 over 106 | 96 over 100 |
| Hero headline, lines | two line lockups | three, at every width from 768 to 1920 | two, at every width from 768 to 1920 |
| Display tracking | -0.015em at 80 and 96 | -0.045em hero, -0.035em and -0.04em headlines | -0.02em |
| Display optical size | SF Pro Display above body sizes | Inter text cut at every size | Inter display cut from 32px up |
| Section headline | 80 over 84 | 80 over 83 | 80 over 84 |
| "Get the highlights." | 48 over 52 | 40 over 46 | 48 over 52 |
| Section eyebrow | 21 to 24px, weight 600, neutral | 13px, weight 600, link blue | 21px, weight 600, neutral |
| Lede | 21 over 29, weight 600, `#86868b` | 20.9 over 30.3, weight 400 | 20.9 over 28.8, weight 600 |
| Label and card headline | 28 to 32px | 40px | 32px |
| Reading text | 17 over 25 | 15 and 16px | 17 over 25 |
| Filled button | `#0071e3`, white text, every ground | `#0066cc` on light, `#2997ff` with black text on dark | `#0071e3`, white text, every ground |
| Large button side padding | 21px plus a 1px border | 24px | 22px |
| Card border | none | 1px | none |
| Card shadow | none | two layer drop shadow | none |
| Card radius | 28px, on 180 of the 181 cards sampled | 18px on 19 cards, 28px on 5 | 28px on all 24 |
| Card fill | white on gray, gray on white, `#1d1d1f` on black | white on everything light | white on gray, gray on white, `#1d1d1f` on black |
| Card gutter | 18 to 20px | 16px | 20px |
| Nav backdrop filter | `saturate(1.8) blur(20px)` | **`none`**, see the first bug below | `saturate(1.8) blur(20px)` |
| Product nav fill | `rgba(250, 250, 252, 0.8)` | page white at 0.92 | page white at 0.8 |
| Product nav hairline | `rgba(0, 0, 0, 0.16)` | `#d2d2d7` at 0.7 | `rgba(0, 0, 0, 0.16)` |
| Product nav links | 12px at 0.8 opacity | 12px at 0.6 | 12px at 0.8 |
| Nav content width | 980 | 940 global, 1088 product | 980 both |
| Promo ribbon text | 14 over 20 | 12px | 14 over 20 from the small breakpoint up |
| Hover and state easing | `cubic-bezier(0.4, 0, 0.6, 1)` at 0.24s and 0.32s | `cubic-bezier(0.16, 1, 0.3, 1)` at 0.25s and 0.4s | `cubic-bezier(0.4, 0, 0.6, 1)` at 0.24s and 0.32s |

## Bugs the comparison surfaced

None of these were visible by reading the code. All four are fixed.

**1. Neither nav bar blurred in Chrome.** `index.css` declared both
`backdrop-filter` and `-webkit-backdrop-filter`. The build kept the prefixed
line and dropped the unprefixed one, and Chrome ignores the prefixed form, so
the computed value was `none`. The glass header was only glass in Safari. The
fix is to write the unprefixed property alone and let the build add the prefix,
which it does: the built stylesheet now carries both.

**2. The highlight cards were 632 to 1096 pixels wide on a phone.** The cards
carried `min-w-[76vw]` and no width. A flex item inside a horizontal scroller
with only a minimum grows to fit its longest sentence on one line. Page level
overflow was zero, which is why the overflow check never caught it. They are
now 78vw, which is 304 pixels on a 390 pixel screen.

**3. The hero was three lines, not two.** The headline is authored as two
lines. At 104 pixels the second line was too wide for its 1024 pixel container
and broke after the first word, at every width from 768 to 1920. The type now
caps at 96 and the stage is 1260 wide, and both lines hold from 768 up.

**4. The pinned feature band overflowed its own box on a small laptop.** At
1280 by 720 the pinned composition was 675 pixels tall inside a 668 pixel box.
The image cap went from 44vh to 40vh, which leaves 20 pixels spare there and 88
at 1440 by 900.

## Measured, and deliberately left alone

| Property | Apple | This site | Why it stays |
|---|---|---|---|
| Content width | 980 for text, 1260 for galleries | 1152 everywhere | Sits between the two and nothing reads as wrong. Revisit only if the grids start to feel narrow |
| Page white | `#ffffff` on MacBook Air, `#fafafc` at the foot of iPhone | `#fbfbfd` | Within one step of both, and it is the value on Apple's home page tiles |
| Band sequence | iPhone and iPad run black against `#1d1d1f` and `#161617` the whole way down | dark, gray, light, dark, light, gray, light, gray, dark, gray | A resume has long reading sections that belong on light grounds. This is a design decision, not a miss |
| Section padding | 144 on iPhone, 160 on MacBook Air, 90 to 204 on iPad | 160 | Already inside their range |
| Lede color on light | `#86868b` | `#6e6e73` | `#86868b` on white is 3.6 to 1 and fails contrast at 17px. On black, where it passes, this site now uses Apple's value |
| Local nav style | A floating dark capsule on iPhone 18 Pro, 1024 by 52 with an 18px radius. The classic full width bar on MacBook Air | The classic full width bar | Apple runs both today, and the one this site has is still live. Adopting the capsule is a redesign of the header, not a correction |
| Entrance easing | Not measurable, their reveals are driven by JavaScript | `cubic-bezier(0.16, 1, 0.3, 1)` | It is this site's own curve and is now documented as such instead of being called Apple's |

## Apple's type ramp at 1440

Resolved values, with tracking as a ratio of font size.

| Role | Size over line height | Weight | Tracking |
|---|---|---|---|
| Largest lockup | 96 over 100 | 600 | -0.015em |
| Hero and section headline | 80 over 84 | 600 | -0.015em |
| Secondary headline | 64 over 68 | 600 | -0.009em |
| | 56 over 60 | 600 | -0.005em |
| Section header | 48 over 52 | 600 | -0.003em |
| Label, eyebrow super | 32 over 36 | 600 | 0.004em |
| Card headline | 28 over 32 | 600 | 0.007em |
| Section label | 24 over 28 | 600 | 0.009em |
| Intro copy and eyebrow | 21 over 29 | 600 | 0.011em |
| Body | 17 over 25 | 400 | -0.022em |
| Footnote and nav | 12 over 16 | 400 | -0.01em |

This site's tracking is -0.02em at display sizes, not -0.015em. The typeface is
Inter, not SF Pro, and Inter's own guidance for display sizes is -0.022em. The
value sits between the two references. The -0.045em it replaced was double
either one.

## Acceptance, as fixed numbers

These are the criteria BACKLOG item J3 asked for. All ten pass on the build
measured above.

1. No type on the page resolves larger than 96px at 1440 wide.
2. The hero headline renders as exactly two lines at 768, 1024, 1280, 1440 and 1920 wide.
3. Display type from 48px up carries tracking between -0.025em and -0.01em.
4. Every `.pill` computes to `rgb(0, 113, 227)` with white text, on light and dark grounds.
5. Every `.band-card` computes to a 28px radius, a 0px border and no box shadow.
6. `.global-nav` and `.product-nav` compute a `backdrop-filter` that is not `none` in Chromium.
7. Section eyebrows resolve to 21px at 1440 and are not link blue.
8. Ledes resolve to weight 600.
9. No highlight card is wider than the viewport at 390 wide.
10. The pinned feature band content is shorter than its sticky box at 1280 by 720.

## Running it again

`node scripts/apple-audit.mjs` from a machine that can reach apple.com. Its
default pages were updated in this pass, because `/macbook-pro/` stopped being
a flagship page. When Apple next moves, the first thing to check is whether the
pages it loads are still the long product pages it assumes they are.
