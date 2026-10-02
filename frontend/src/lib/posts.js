/**
 * The newsroom feed, merged from two sources.
 *
 * Local posts are markdown files in src/content/posts, parsed and sanitized by
 * lib/markdown.js, and they open in the reader view on this site.
 *
 * External posts are published on dev.to and link out. They are not copied
 * here on purpose: dev.to stays the canonical home for that writing, so there
 * is one URL per article rather than two competing for the same search result,
 * and a correction is made in one place. Their metadata lives in
 * src/data/externalPosts.json and is refreshed with `npm run sync:blog`.
 *
 * Both shapes carry the same fields the newsroom cards read, so the component
 * renders one feed and only branches on whether a post has a url (external) or
 * a slug (local).
 */

import { posts as localPosts, findPost } from "./markdown.js";
import externalPosts from "../data/externalPosts.json";

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

const external = externalPosts.map((post) => ({
  ...post,
  displayDate: formatDate(post.date),
  isExternal: true,
}));

const local = localPosts.map((post) => ({
  ...post,
  isExternal: false,
}));

/** Every post, newest first, regardless of where it lives. */
export const feed = [...local, ...external].sort((a, b) =>
  a.date < b.date ? 1 : -1,
);

export { findPost };
