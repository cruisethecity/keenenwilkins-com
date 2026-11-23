/**
 * Link preview card builder.
 *
 * WHY THIS EXISTS
 *
 * When someone pastes the site address into LinkedIn, Slack or a text message,
 * the card that appears is built from the og tags in index.html. The picture on
 * that card is one fixed image file. Without it the card is a bare link, which
 * is what this site shipped with, and a bare link under a launch post reads as
 * unfinished before anyone has clicked.
 *
 * This script draws that image from the same resumeData.json the page reads,
 * so the card says what the hero says. It is 1200 by 627 pixels, the size
 * LinkedIn asks for.
 *
 * USAGE
 *
 *   npm --prefix frontend i --no-save playwright      # once
 *   npx --prefix frontend playwright install chromium # once
 *   node scripts/build-og.mjs
 *
 * Writes frontend/public/og.png. Vite copies the public folder to the site
 * root, so the image is served at /og.png. The address in index.html has to be
 * the full one, domain included, because the services that read these tags do
 * not resolve relative paths.
 *
 * Run it again whenever the hero headline, the name or the discipline changes.
 * LinkedIn keeps its own copy of the card, so after a change is live, run the
 * address through LinkedIn's Post Inspector to make it fetch the new one.
 *
 * Options: --data <json>  --out <png>  --font <woff2>
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 && process.argv[index + 1] ? resolve(process.argv[index + 1]) : fallback;
}

const DATA = option("data", resolve(root, "frontend/src/data/resumeData.json"));
const OUT = option("out", resolve(root, "frontend/public/og.png"));
const FONT = option(
  "font",
  resolve(root, "frontend/node_modules/@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2"),
);

// The page never prints its own address, so it is not in the data file.
const SITE = "keenenwilkins.com";

// The one line on the card that is not hero copy. Both halves are checkable
// in this repository: the Terraform modules, and the two workflow files.
const PROOF = "Built on AWS with Terraform. Deployed by pipelines that hold no keys.";

const WIDTH = 1200;
const HEIGHT = 627;

function loadPlaywright() {
  for (const base of [resolve(root, "frontend/package.json"), import.meta.url]) {
    try {
      return createRequire(base)("playwright");
    } catch {
      // try the next place
    }
  }
  throw new Error("playwright is not installed, see USAGE at the top of this file");
}

const escape = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const data = JSON.parse(readFileSync(DATA, "utf8"));
const { meta, hero } = data;

const fontFace = existsSync(FONT)
  ? `@font-face{font-family:"Inter Variable";font-weight:100 900;font-style:normal;` +
    `src:url(data:font/woff2;base64,${readFileSync(FONT).toString("base64")}) format("woff2-variations");}`
  : "";

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
${fontFace}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; }
body {
  position: relative;
  overflow: hidden;
  background: #000;
  color: #f5f5f7;
  font-family: "Inter Variable", Inter, "Helvetica Neue", Arial, sans-serif;
  font-optical-sizing: auto;
  -webkit-font-smoothing: antialiased;
}
/* The same blue glow the hero carries, pulled up so it sits behind the headline. */
.glow {
  position: absolute; left: 50%; top: -58%;
  width: 1700px; height: 900px; transform: translateX(-50%);
  background: radial-gradient(ellipse at center, rgba(41, 151, 255, 0.3), transparent 62%);
  filter: blur(40px);
}
.frame { position: absolute; inset: 0; padding: 52px 64px 50px; display: flex; flex-direction: column; }
.top { display: flex; justify-content: space-between; align-items: baseline; }
.name { font-size: 27px; font-weight: 600; letter-spacing: -0.01em; }
.site { font-size: 23px; font-weight: 500; color: #a1a1a6; }
.middle { flex: 1; display: flex; flex-direction: column; justify-content: center; text-align: center; padding-bottom: 6px; }
h1 { font-size: 94px; line-height: 1.04; font-weight: 600; letter-spacing: -0.022em; }
.discipline { margin-top: 26px; font-size: 30px; font-weight: 600; color: #86868b; letter-spacing: -0.005em; }
.proof { text-align: center; font-size: 21px; color: #86868b; }
</style>
</head>
<body>
<div class="glow"></div>
<div class="frame">
  <div class="top"><span class="name">${escape(meta.name)}</span><span class="site">${escape(SITE)}</span></div>
  <div class="middle">
    <h1>${hero.headline.map(escape).join("<br>")}</h1>
    <p class="discipline">${escape(meta.discipline)}</p>
  </div>
  <p class="proof">${escape(PROOF)}</p>
</div>
</body>
</html>`;

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);

// A headline that is too long for the card would be cut off silently, so
// measure it and refuse instead.
const fits = await page.evaluate(() => {
  const h1 = document.querySelector("h1");
  return h1.scrollWidth <= h1.clientWidth && document.documentElement.scrollHeight <= window.innerHeight;
});
const fontLoaded = await page.evaluate(() => document.fonts.check('600 94px "Inter Variable"'));

const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
await browser.close();

if (!fits) throw new Error("the headline does not fit on the card, shorten it or lower the size in this script");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, png);

console.log(`wrote ${OUT}`);
console.log(`  ${WIDTH} by ${HEIGHT}, ${png.length} bytes, font: ${fontLoaded && fontFace ? "Inter" : "fallback, Inter not found"}`);
