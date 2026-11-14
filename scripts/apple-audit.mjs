/**
 * apple.com design audit.
 *
 * WHY THIS EXISTS
 *
 * "Make it closer to apple.com" is not an acceptance criterion. Two people can
 * look at the same page and disagree about whether it passed, which means it
 * generates churn forever and never closes.
 *
 * This script replaces the opinion with measurement. It loads Apple's live
 * flagship pages, reads the computed styles the browser actually resolved, and
 * diffs them against the tokens in src/index.css. The output is a table of real
 * deltas. You read it once, decide which handful matter, write those as fixed
 * numeric criteria in BACKLOG.md, and close J3 permanently.
 *
 * It is a snapshot to decide against, not a target to chase. Apple ships
 * redesigns on their schedule.
 *
 * WHERE IT CAN RUN
 *
 * Anywhere Chromium can reach apple.com. That means your Mac, and it means a
 * Claude Code cloud session only if that environment's network access allows
 * apple.com. The default "Trusted" access level does not: it covers package
 * registries and little else, and apple.com comes back as a refused CONNECT.
 * Check the environment's network access setting before assuming.
 *
 * USAGE
 *
 *   npm --prefix frontend i -D playwright   # once
 *   npx playwright install chromium         # once
 *   node scripts/apple-audit.mjs
 *
 * Optional: pass your own URLs.
 *
 *   node scripts/apple-audit.mjs https://www.apple.com/ipad-pro/
 *
 * Writes docs/apple-audit.json and docs/apple-audit.md.
 */

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "playwright is not installed.\n" +
      "  npm --prefix frontend i -D playwright\n" +
      "  npx playwright install chromium",
  );
  process.exit(1);
}

const PAGES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      // Checked 13 November 2026. /macbook-pro/ used to be on this list and is
      // no longer a product page: it is a two model chooser with almost nothing
      // to measure. Before trusting a run, confirm these are still the long
      // flagship pages this script assumes.
      "https://www.apple.com/iphone-18-pro/",
      "https://www.apple.com/ipad-pro/",
      "https://www.apple.com/macbook-air/",
    ];

const VIEWPORT = { width: 1440, height: 900 };

/* ------------------------------------------------------------------ probe */

/**
 * Runs inside the page. Everything here reads resolved values rather than
 * authored CSS, which is the point: Apple's type is fluid, so the authored
 * clamp() tells you nothing without a viewport to resolve it against.
 */
function probe() {
  const px = (v) => (v && v !== "normal" ? Math.round(parseFloat(v) * 100) / 100 : null);
  const seen = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const typeOf = (sel) => {
    const el = [...document.querySelectorAll(sel)].find(seen);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      sample: el.innerText.replace(/\s+/g, " ").slice(0, 48),
      fontSize: px(cs.fontSize),
      lineHeight: px(cs.lineHeight),
      // Tracking is reported in px. As a ratio of font size it is comparable
      // across sizes, which is how Apple actually specifies it.
      letterSpacingPx: px(cs.letterSpacing),
      letterSpacingEm:
        px(cs.letterSpacing) && px(cs.fontSize)
          ? Math.round((px(cs.letterSpacing) / px(cs.fontSize)) * 10000) / 10000
          : 0,
      fontWeight: cs.fontWeight,
      fontFamily: cs.fontFamily.split(",")[0].replace(/"/g, ""),
    };
  };

  // Band rhythm. Consecutive duplicates are collapsed, because what matters is
  // the alternation pattern, not how many sections happen to share a ground.
  const grounds = [];
  for (const el of document.querySelectorAll("section, [class*='section'], main > div")) {
    if (!seen(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 200) continue;
    const bg = getComputedStyle(el).backgroundColor;
    if (bg === "rgba(0, 0, 0, 0)") continue;
    if (grounds.at(-1)?.bg !== bg) grounds.push({ bg, height: Math.round(r.height) });
  }

  // Vertical rhythm. The median is more useful than the mean, because one
  // oversized hero drags the mean and tells you nothing about the body.
  const pads = [];
  for (const el of document.querySelectorAll("section")) {
    if (!seen(el) || el.getBoundingClientRect().height < 200) continue;
    const cs = getComputedStyle(el);
    const t = px(cs.paddingTop);
    const b = px(cs.paddingBottom);
    if (t) pads.push(t);
    if (b) pads.push(b);
  }
  pads.sort((a, b) => a - b);

  // Sticky or fixed chrome, which is the two bar header on every Apple page.
  const bars = [...document.querySelectorAll("header, nav, [role='banner']")]
    .filter(seen)
    .map((el) => {
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        position: cs.position,
        height: Math.round(el.getBoundingClientRect().height),
        backgroundColor: cs.backgroundColor,
        backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || "none",
      };
    })
    .filter((b) => b.position === "sticky" || b.position === "fixed" || b.height > 30);

  // Easing. A histogram, because the curve a design actually uses is the one it
  // repeats, not the one that appears once on a carousel.
  const eases = {};
  const durations = {};
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const f = cs.transitionTimingFunction;
    const d = cs.transitionDuration;
    if (f && f !== "ease" && f !== "all") eases[f] = (eases[f] ?? 0) + 1;
    if (d && d !== "0s") durations[d] = (durations[d] ?? 0) + 1;
  }
  const top = (o, n) =>
    Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => ({ value: k, count: v }));

  // Content measure. The widest recurring container is the page's real grid.
  const widths = {};
  for (const el of document.querySelectorAll("div, section, main")) {
    if (!seen(el)) continue;
    const w = Math.round(el.getBoundingClientRect().width);
    if (w > 600 && w < 1440) widths[w] = (widths[w] ?? 0) + 1;
  }

  return {
    title: document.title.slice(0, 80),
    type: {
      h1: typeOf("h1"),
      h2: typeOf("h2"),
      h3: typeOf("h3"),
      body: typeOf("p"),
      caption: typeOf("figcaption, small, .caption, footer p"),
    },
    grounds: grounds.slice(0, 14),
    sectionPadding: {
      min: pads[0] ?? null,
      median: pads.length ? pads[Math.floor(pads.length / 2)] : null,
      max: pads.at(-1) ?? null,
      samples: pads.length,
    },
    bars: bars.slice(0, 4),
    easing: top(eases, 5),
    durations: top(durations, 5),
    containers: top(widths, 5),
  };
}

/* -------------------------------------------------------------- our tokens */

/** Pull the @theme values out of index.css so the diff has something to sit against. */
function ourTokens() {
  const css = readFileSync(resolve(ROOT, "frontend/src/index.css"), "utf8");
  const grab = (name) => {
    const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
    return m ? m[1].trim().replace(/\s+/g, " ") : null;
  };
  return {
    display: grab("text-display"),
    headline: grab("text-headline"),
    title: grab("text-title"),
    lede: grab("text-lede"),
    page: grab("color-page"),
    band: grab("color-band"),
    ink: grab("color-ink"),
    muted: grab("color-muted"),
    rule: grab("color-rule"),
    link: grab("color-link"),
    ease: grab("ease-apple"),
  };
}

/**
 * Resolve a clamp() the way the browser would at a given viewport, so our fluid
 * sizes can be compared to Apple's resolved pixel values rather than to nothing.
 */
function resolveClamp(expr, viewportPx, rootPx = 16) {
  if (!expr) return null;
  const m = expr.match(/clamp\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (!m) return null;
  const toPx = (s) => {
    s = s.trim();
    if (s.endsWith("rem")) return parseFloat(s) * rootPx;
    if (s.endsWith("vw")) return (parseFloat(s) / 100) * viewportPx;
    if (s.endsWith("px")) return parseFloat(s);
    return NaN;
  };
  const [lo, pref, hi] = [toPx(m[1]), toPx(m[2]), toPx(m[3])];
  return Math.round(Math.min(Math.max(lo, pref), hi) * 100) / 100;
}

/* -------------------------------------------------------------------- run */

const browser = await chromium.launch();
const results = [];
const failures = [];

for (const url of PAGES) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    results.push({ url, status: res?.status() ?? null, ...(await page.evaluate(probe)) });
    console.log("measured", url);
  } catch (err) {
    const reason = String(err).split("\n")[0];
    failures.push({ url, reason });
    console.error("FAILED  ", url, "\n         ", reason);
  }
  await page.close();
}

await browser.close();

if (!results.length) {
  console.error(
    "\nNothing measured. Every page failed to load.\n" +
      "If the errors mention ERR_TUNNEL_CONNECTION_FAILED or a 403 on CONNECT,\n" +
      "the network this is running on does not allow apple.com. Run it from your\n" +
      "Mac, or widen the cloud environment's network access.",
  );
  process.exit(1);
}

const ours = ourTokens();
mkdirSync(resolve(ROOT, "docs"), { recursive: true });
writeFileSync(
  resolve(ROOT, "docs/apple-audit.json"),
  JSON.stringify({ measuredAt: new Date().toISOString(), viewport: VIEWPORT, ours, apple: results, failures }, null, 2),
);

/* ------------------------------------------------------------------ report */

const L = [];
const row = (...c) => L.push(`| ${c.join(" | ")} |`);
const n = (v) => (v == null ? "n/a" : `${v}px`);

L.push("# apple.com audit");
L.push("");
L.push(`Measured ${new Date().toISOString().slice(0, 10)} at ${VIEWPORT.width}x${VIEWPORT.height}.`);
L.push("");
L.push("A snapshot to decide against, not a target to chase. Pick the deltas that");
L.push("matter, write them into BACKLOG.md as fixed numbers, and close J3.");
L.push("");
if (failures.length) {
  L.push(`> ${failures.length} page(s) failed to load: ${failures.map((f) => f.url).join(", ")}`);
  L.push("");
}

L.push("## Type scale");
L.push("");
row("Role", ...results.map((r) => new URL(r.url).pathname.replace(/\//g, "") || "home"), "Ours at 1440");
row("---", ...results.map(() => "---"), "---");
for (const [role, token] of [["h1", "display"], ["h2", "headline"], ["h3", "title"], ["body", "lede"]]) {
  row(
    role,
    ...results.map((r) => (r.type[role] ? `${n(r.type[role].fontSize)} / ${r.type[role].fontWeight}` : "n/a")),
    n(resolveClamp(ours[token], VIEWPORT.width)),
  );
}
L.push("");
L.push("Tracking, as a ratio of font size. Ours is set per element in the components.");
L.push("");
row("Role", ...results.map((r) => new URL(r.url).pathname.replace(/\//g, "") || "home"));
row("---", ...results.map(() => "---"));
for (const role of ["h1", "h2", "body"]) {
  row(role, ...results.map((r) => (r.type[role] ? `${r.type[role].letterSpacingEm}em` : "n/a")));
}

L.push("");
L.push("## Vertical rhythm");
L.push("");
row("Page", "Min section padding", "Median", "Max", "Samples");
row("---", "---", "---", "---", "---");
for (const r of results) {
  row(
    new URL(r.url).pathname,
    n(r.sectionPadding.min),
    n(r.sectionPadding.median),
    n(r.sectionPadding.max),
    r.sectionPadding.samples,
  );
}
L.push("");
L.push("Ours: `py-28 sm:py-40`, which is 112px and 160px.");

L.push("");
L.push("## Band rhythm");
L.push("");
for (const r of results) {
  L.push(`**${new URL(r.url).pathname}**`);
  L.push("");
  L.push(r.grounds.length ? r.grounds.map((g) => `\`${g.bg}\``).join(" → ") : "_no opaque section grounds found_");
  L.push("");
}
L.push("Ours, in order: `dark gray light dark light gray light gray dark gray`.");

L.push("");
L.push("## Header");
L.push("");
row("Page", "Tag", "Position", "Height", "Background", "Backdrop filter");
row("---", "---", "---", "---", "---", "---");
for (const r of results) {
  for (const b of r.bars) {
    row(new URL(r.url).pathname, b.tag, b.position, `${b.height}px`, `\`${b.backgroundColor}\``, `\`${b.backdropFilter}\``);
  }
}
L.push("");
L.push("Ours: 44px global nav that scrolls away, 52px product nav that sticks.");

L.push("");
L.push("## Motion");
L.push("");
row("Page", "Most used easing", "Most used duration");
row("---", "---", "---");
for (const r of results) {
  row(
    new URL(r.url).pathname,
    r.easing.length ? `\`${r.easing[0].value}\` (${r.easing[0].count})` : "none",
    r.durations.length ? `\`${r.durations[0].value}\` (${r.durations[0].count})` : "none",
  );
}
L.push("");
L.push(`Ours: \`${ours.ease}\`, applied at three amplitudes.`);

L.push("");
L.push("## Content measure");
L.push("");
row("Page", "Most repeated container widths");
row("---", "---");
for (const r of results) {
  row(new URL(r.url).pathname, r.containers.map((c) => `${c.value}px (${c.count})`).join(", ") || "n/a");
}
L.push("");
L.push("Ours: `max-w-6xl`, which is 1152px, and 980px of content inside both nav bars.");
L.push("");

writeFileSync(resolve(ROOT, "docs/apple-audit.md"), L.join("\n"));

console.log(`\nWrote docs/apple-audit.md and docs/apple-audit.json`);
console.log(`${results.length} page(s) measured, ${failures.length} failed.`);
