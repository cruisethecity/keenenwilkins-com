/**
 * Resume PDF builder.
 *
 * WHY THIS EXISTS
 *
 * The site has a Download resume button, and for a long time the file behind
 * it was a placeholder. The usual fix is to export a document by hand and drop
 * it in public/resume, which works until the site changes and the PDF does
 * not. Then the page says one thing and the download says another, and a
 * reader who compares them stops trusting both.
 *
 * This script removes the second copy. It reads the same resumeData.json the
 * page renders from and prints a one page PDF from it, so a change to the data
 * changes both.
 *
 * WHAT IT LEAVES OUT ON PURPOSE
 *
 * No phone number. The site does not publish one and a public PDF gets
 * scraped.
 *
 * No project metrics. The short figures on the project tiles are written for
 * the page. A resume is the document people quote back to you in an
 * interview, so it carries the project summaries and the stacks, which are
 * checkable against the repositories, and no figures.
 *
 * FORMAT
 *
 * The Jake Ryan layout: EB Garamond, capital section heads over a hairline,
 * dates set flush right. The heads are true capitals, not small caps. Browsers
 * fake small caps by shrinking capital letters, and some resume scanners read
 * the result as "E DUCATION", which hides the section from them.
 *
 * No hyphens, no dashes and no parentheses in the text. The script refuses to
 * write the file if any of those slip in, or if the result runs past one
 * page.
 *
 * USAGE
 *
 *   npm --prefix frontend i --no-save playwright @fontsource/eb-garamond   # once
 *   npx --prefix frontend playwright install chromium                      # once
 *   node scripts/build-resume.mjs
 *
 * Writes frontend/public/resume/keenen-wilkins-resume.pdf. Without the font
 * package it still runs and falls back to Georgia.
 *
 * Options: --data <json>  --out <pdf>  --fonts <dir>  --html <file>
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 && process.argv[index + 1] ? resolve(process.argv[index + 1]) : fallback;
}

const DATA = option("data", resolve(root, "frontend/src/data/resumeData.json"));
const OUT = option("out", resolve(root, "frontend/public/resume/keenen-wilkins-resume.pdf"));
const FONTS = option("fonts", resolve(root, "frontend/node_modules/@fontsource/eb-garamond/files"));
const HTML_OUT = option("html", null);

// The site address is not in the data file, because the page never needs to
// print its own address. The resume does.
const SITE = "keenenwilkins.com";

// Sentences that only make sense on the web page, where there is a newsroom
// further down. They are cut from the resume.
const PAGE_ONLY = [/\s*Week one is in the newsroom below\./];
const forPaper = (line) => PAGE_ONLY.reduce((text, pattern) => text.replace(pattern, ""), line).trim();

// How much of each list the one page has room for.
const SKILL_ITEMS_PER_GROUP = 2;
const STACK_ITEMS_PER_PROJECT = 5;

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

const bare = (url) => String(url).replace(/^https?:\/\/(www\.)?/, "").replace(/^mailto:/, "");

function fontFaces() {
  if (!existsSync(FONTS)) return { css: "", found: false };

  const faces = [];
  for (const weight of [400, 600, 700]) {
    for (const style of ["normal", "italic"]) {
      const file = resolve(FONTS, `eb-garamond-latin-${weight}-${style}.woff2`);
      if (!existsSync(file)) continue;
      const bytes = readFileSync(file).toString("base64");
      faces.push(
        `@font-face{font-family:"EB Garamond";font-weight:${weight};font-style:${style};` +
          `src:url(data:font/woff2;base64,${bytes}) format("woff2");}`,
      );
    }
  }
  return { css: faces.join("\n"), found: faces.length > 0 };
}

function build(data, { size, withSummaries }) {
  const { meta, experience, projects, specs, credentials } = data;

  const contact = [
    meta.location,
    bare(meta.links.email),
    SITE,
    bare(meta.links.linkedin),
    bare(meta.links.github),
  ];

  const earned = credentials.certifications.filter((item) => item.status === "Earned");
  const upcoming = credentials.certifications.filter((item) => item.status !== "Earned");

  const education = credentials.education
    .map(
      (item) => `
      <div class="row"><span class="strong">${escape(item.institution)}</span><span>${escape(item.status)}</span></div>
      <div class="row sub"><span>${escape(item.credential)}</span><span></span></div>`,
    )
    .join("");

  const jobs = experience
    .map((role) => {
      const lines = withSummaries ? [role.summary, ...role.bullets] : role.bullets;
      return `
      <div class="entry">
        <div class="row"><span class="strong">${escape(role.company)}</span><span>${escape(role.dateRange)}</span></div>
        <div class="row sub"><span>${escape(role.role)}</span><span>${escape(role.location)}</span></div>
        <ul>${lines.map((line) => `<li>${escape(forPaper(line))}</li>`).join("")}</ul>
      </div>`;
    })
    .join("");

  const work = projects
    .map((project) => {
      // A project with no repository link is this site, so it points at itself.
      const link = project.repo ? bare(project.repo) : SITE;
      return `
      <div class="entry">
        <div class="row"><span><span class="strong">${escape(project.title)}</span> <span class="bar">|</span> <span class="em">${escape(project.stack.slice(0, STACK_ITEMS_PER_PROJECT).join(", "))}</span></span><span class="link">${escape(link)}</span></div>
        <ul><li>${escape(project.summary)}</li></ul>
      </div>`;
    })
    .join("");

  // The page prints every line of every skills group. A resume wants the
  // keyword lines, so each group gives its first two items. A group made only
  // of short names, like the languages, is printed whole.
  const skills = specs
    .map((group) => {
      const short = group.items.every((item) => item.length <= 14);
      const items = short ? group.items : group.items.slice(0, SKILL_ITEMS_PER_GROUP);
      return `<p class="skill"><span class="strong">${escape(group.group)}:</span> ${escape(items.join("; "))}</p>`;
    })
    .join("");

  const { css: faces } = fontFaces();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(meta.name)} Resume</title>
<style>
${faces}
@page { size: Letter; margin: 0.38in 0.46in; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: ${size}pt; }
body { font-family: "EB Garamond", Garamond, Georgia, serif; color: #000; line-height: 1.14; font-variant-numeric: lining-nums; }
h1 { text-align: center; font-size: 2.2rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1; }
.contact { text-align: center; font-size: 0.95rem; margin-top: 0.3rem; }
.contact .bar { margin: 0 0.42em; }
h2 { font-size: 0.98rem; font-weight: 400; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 0.6pt solid #000; margin: 0.62rem 0 0.26rem; padding-bottom: 0.1rem; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 1.2em; }
.row > span:last-child { white-space: nowrap; text-align: right; }
.sub { font-style: italic; font-size: 0.96rem; }
.strong { font-weight: 700; }
.em { font-style: italic; }
.bar { font-weight: 400; }
.link { font-size: 0.86rem; }
.entry { margin-top: 0.3rem; break-inside: avoid; }
.entry:first-of-type { margin-top: 0; }
ul { margin: 0.1rem 0 0 1.25em; }
li { font-size: 0.96rem; margin-top: 0.07rem; padding-left: 0.1em; text-wrap: pretty; }
li::marker { font-size: 0.72em; }
p.certs, p.skill { font-size: 0.96rem; margin-top: 0.1rem; }
</style>
</head>
<body>
<h1>${escape(meta.name)}</h1>
<p class="contact">${contact.map(escape).join('<span class="bar">|</span>')}</p>

<h2>Education and Certifications</h2>
${education}
<p class="certs"><span class="strong">Certifications:</span> ${earned.map((item) => escape(item.name)).join("; ")}</p>
${
  upcoming.length
    ? `<p class="certs">${[...new Set(upcoming.map((item) => item.status))]
        .map(
          (status) =>
            `<span class="strong">${escape(status)}:</span> ${upcoming
              .filter((item) => item.status === status)
              .map((item) => escape(item.name))
              .join("; ")}`,
        )
        .join(". ")}</p>`
    : ""
}

<h2>Experience</h2>
${jobs}

<h2>Projects</h2>
${work}

<h2>Technical Skills</h2>
${skills}
</body>
</html>`;
}

// Hyphens between letters, dashes and parentheses are all banned from the
// reader visible text. Web addresses, email addresses and repository names
// are identifiers, not prose, so a token that looks like an address may keep
// its hyphens.
const looksLikeAddress = (token) => /@|\/|\.[a-z]{2,}\b/i.test(token);

function copyProblems(text) {
  const problems = [];
  for (const token of text.split(/\s+/)) {
    if (!looksLikeAddress(token) && /[A-Za-z]-[A-Za-z]/.test(token)) problems.push(`hyphen: ${token}`);
    if (/[\u2013\u2014]/.test(token)) problems.push(`dash: ${token}`);
    if (/[()]/.test(token)) problems.push(`parenthesis: ${token}`);
  }
  return problems;
}

// Chromium writes the page tree uncompressed, so the page count can be read
// straight out of the file without a PDF library.
function pageCount(buffer) {
  const raw = buffer.toString("latin1");
  const counts = [...raw.matchAll(/\/Count\s+(\d+)/g)].map((match) => Number(match[1]));
  if (counts.length) return Math.max(...counts);
  return (raw.match(/\/Type\s*\/Page(?!s)/g) || []).length;
}

const data = JSON.parse(readFileSync(DATA, "utf8"));
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage();

// Try the largest type first and step down until it fits on one page. The
// role summaries are the first thing dropped if nothing fits.
const attempts = [];
for (const withSummaries of [true, false]) {
  for (let tenths = 106; tenths >= 94; tenths -= 1) attempts.push({ size: tenths / 10, withSummaries });
}

let chosen = null;
let html = "";
let pdf = null;

for (const attempt of attempts) {
  html = build(data, attempt);
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  pdf = await page.pdf({ format: "Letter", printBackground: true, preferCSSPageSize: true });
  if (pageCount(pdf) === 1) {
    chosen = attempt;
    break;
  }
}

if (!chosen) {
  await browser.close();
  // Leave the overflowing attempt on disk so the extra lines are easy to see.
  const overflow = OUT.replace(/\.pdf$/, ".overflow.pdf");
  mkdirSync(dirname(overflow), { recursive: true });
  writeFileSync(overflow, pdf);
  throw new Error(`the resume does not fit on one page at any allowed size. Trim the data. The last attempt is at ${overflow}`);
}

const text = await page.evaluate(() => document.body.innerText);
const fontUsed = await page.evaluate(() => document.fonts.check('12px "EB Garamond"'));
await browser.close();

const problems = copyProblems(text);
if (problems.length) {
  throw new Error(`banned characters in the resume text:\n  ${problems.join("\n  ")}`);
}
if (/\d{3}[.\s-]\d{3}[.\s-]\d{4}/.test(text)) {
  throw new Error("something shaped like a phone number is in the resume text");
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, pdf);
if (HTML_OUT) writeFileSync(HTML_OUT, html);

console.log(`wrote ${OUT}`);
console.log(`  ${pdf.length} bytes, one page, ${chosen.size}pt, role summaries ${chosen.withSummaries ? "kept" : "dropped"}`);
console.log(`  font: ${fontUsed && fontFaces().found ? "EB Garamond" : "fallback, EB Garamond not found"}`);
console.log(`  source: ${pathToFileURL(DATA).pathname}`);
