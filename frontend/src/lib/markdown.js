/**
 * Local markdown pipeline for the newsroom.
 *
 * There is no CMS and no fetch at runtime. Vite's import.meta.glob pulls every
 * file in src/content/posts into the bundle at build time as a raw string, so
 * an article is a file in the repository, the whole site stays static, and the
 * only thing the browser needs at runtime is the parser.
 *
 * The parsed HTML is passed through DOMPurify before it ever reaches
 * dangerouslySetInnerHTML. These files are mine, so this is not a live threat,
 * but shipping an unsanitized HTML injection point in a security portfolio is
 * the kind of detail a reviewer notices.
 */

import { marked } from "marked";
import DOMPurify from "dompurify";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const WORDS_PER_MINUTE = 220;

marked.use({
  gfm: true,
  breaks: false,
});

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "h1", "h2", "h3", "h4", "p", "a", "ul", "ol", "li", "strong", "em", "code",
    "pre", "blockquote", "hr", "br", "table", "thead", "tbody", "tr", "th",
    "td", "del", "span",
  ],
  ALLOWED_ATTR: ["href", "title", "id", "class", "target", "rel"],
  ALLOW_DATA_ATTR: false,
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, "").trim();
}

/**
 * Minimal YAML style frontmatter reader. Supports scalars and inline arrays,
 * which is everything a blog post needs. A full YAML parser would be another
 * dependency for no gain.
 */
function parseFrontmatter(raw) {
  const match = raw.match(FRONTMATTER_PATTERN);
  if (!match) {
    return { data: {}, body: raw };
  }

  const data = {};

  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf(":");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();

    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      data[key] = rawValue
        .slice(1, -1)
        .split(",")
        .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }

  return { data, body: raw.slice(match[0].length) };
}

function readingTime(body) {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

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

/**
 * Adds stable anchor ids to second level headings and collects them into a
 * table of contents at the same time, so a long write up is linkable.
 */
function buildHeadings(html) {
  const headings = [];

  const withIds = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_match, inner) => {
    const text = stripTags(inner);
    const id = slugify(text);
    headings.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });

  return { html: withIds, headings };
}

const modules = import.meta.glob("../content/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const posts = Object.entries(modules)
  .map(([filePath, raw]) => {
    const slug = filePath.split("/").pop().replace(/\.md$/, "");
    const { data, body } = parseFrontmatter(raw);
    const parsed = marked.parse(body);
    const clean = DOMPurify.sanitize(parsed, SANITIZE_CONFIG);
    const { html, headings } = buildHeadings(clean);

    return {
      slug,
      title: data.title || slug,
      date: data.date || "",
      displayDate: formatDate(data.date),
      summary: data.summary || "",
      category: data.category || "Engineering",
      tags: Array.isArray(data.tags) ? data.tags : [],
      readingMinutes: readingTime(body),
      headings,
      html,
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export function findPost(slug) {
  return posts.find((post) => post.slug === slug) || null;
}
