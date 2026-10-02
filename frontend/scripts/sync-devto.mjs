#!/usr/bin/env node
/**
 * Refresh src/data/externalPosts.json from the dev.to public API.
 *
 *   npm run sync:blog
 *
 * Why a build time sync rather than a runtime fetch. A fetch from the browser
 * would mean adding dev.to to the Content Security Policy connect source, a
 * Terraform change, plus a network dependency on every page load and a visible
 * loading state in the newsroom. Pulling at build time keeps the deployed page
 * fully static and keeps the policy tight.
 *
 * Why link out rather than import the article bodies. dev.to stays canonical.
 * Copying the text here would split the same writing across two URLs, which
 * search engines treat as duplicate content and which means editing a typo in
 * two places forever.
 *
 * The summary field is the one thing this script will not overwrite. dev.to
 * truncates its own description mid sentence, so hand written summaries live
 * in the JSON and survive a resync. Delete a post's summary to have the
 * script fill it from the API.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const USERNAME = "keenenwilkins";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.join(HERE, "..", "src", "data", "externalPosts.json");

// Tags that mark a post as technical rather than a cohort journal entry.
const ENGINEERING_TAGS = new Set([
  "aws",
  "terraform",
  "security",
  "devops",
  "linux",
  "python",
  "cloud",
]);

function categoryFor(tags = []) {
  return tags.some((tag) => ENGINEERING_TAGS.has(tag))
    ? "Engineering"
    : "Field notes";
}

function slugId(url) {
  return `devto-${url.split("/").pop().split("-").slice(0, 3).join("-")}`;
}

async function main() {
  const response = await fetch(
    `https://dev.to/api/articles?username=${USERNAME}&per_page=30`,
    { headers: { Accept: "application/vnd.forem.api-v1+json" } },
  );

  if (!response.ok) {
    throw new Error(`dev.to responded ${response.status}`);
  }

  const articles = await response.json();
  if (!Array.isArray(articles) || articles.length === 0) {
    throw new Error("dev.to returned no articles, refusing to write an empty file");
  }

  // Preserve any summary already written by hand.
  let existing = [];
  try {
    existing = JSON.parse(await readFile(TARGET, "utf8"));
  } catch {
    // First run. Nothing to preserve.
  }
  const summaries = new Map(
    existing.filter((post) => post.summary).map((post) => [post.url, post.summary]),
  );

  const posts = articles
    .map((article) => ({
      id: slugId(article.url),
      title: article.title,
      summary:
        summaries.get(article.url) ??
        (article.description || "").replace(/\s*\.\.\.$/, "."),
      url: article.url,
      date: (article.published_at || "").slice(0, 10),
      readingMinutes: article.reading_time_minutes ?? 1,
      category: categoryFor(article.tag_list),
      source: "dev.to",
      tags: article.tag_list ?? [],
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  await writeFile(TARGET, `${JSON.stringify(posts, null, 2)}\n`);

  console.log(`wrote ${posts.length} posts to src/data/externalPosts.json`);
  for (const post of posts) {
    const kept = summaries.has(post.url) ? " (summary kept)" : "";
    console.log(`  ${post.date}  ${post.category.padEnd(11)} ${post.title}${kept}`);
  }
}

main().catch((error) => {
  console.error(`sync failed: ${error.message}`);
  process.exitCode = 1;
});
