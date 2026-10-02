import { useEffect } from "react";
import { motion } from "motion/react";
import { Clock } from "lucide-react";
import { APPLE_EASE } from "../lib/motion.js";

/**
 * Article reader, on the page white band.
 *
 * The HTML here was already parsed by marked and sanitized by DOMPurify in
 * lib/markdown.js, which is why dangerouslySetInnerHTML is acceptable at this
 * point and would not be one step earlier.
 *
 * Measure is capped near 68 characters. Long form reading is the one place
 * the light ground clearly beats the dark one, which is part of why this view
 * stays on page white while the hero and the lineup stay black.
 *
 * Code blocks keep their dark ground even here. Apple does the same in their
 * developer documentation: syntax is simply easier to scan on dark.
 */
export default function ArticleReader({ post, onBack }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [post.slug]);

  return (
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: APPLE_EASE }}
      className="band mx-auto max-w-3xl px-5 pt-16 pb-24 sm:px-8 sm:pt-24"
    >
      <button type="button" onClick={onBack} className="mb-12 chevron-link-back text-[14px]">
        Back to the newsroom
      </button>

      <article>
        <header className="band-rule mb-12 border-b pb-10">
          <div className="band-faint mb-5 flex flex-wrap items-center gap-3 text-[12px]">
            <span className="bg-link/10 band-link rounded-full px-2.5 py-1 font-medium">
              {post.category}
            </span>
            <span>{post.displayDate}</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} aria-hidden="true" />
              {post.readingMinutes} min read
            </span>
          </div>

          <h1 className="band-ink text-headline font-semibold tracking-[-0.04em] text-balance">
            {post.title}
          </h1>

          {post.summary && (
            <p className="band-muted mt-5 text-lede leading-relaxed">
              {post.summary}
            </p>
          )}

          {post.tags.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="band-chip rounded-md px-2 py-1 font-mono text-[11px]"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </header>

        {post.headings.length > 2 && (
          <nav
            className="band-card mb-12 rounded-tile p-6"
            aria-label="On this page"
          >
            <p className="band-faint mb-4 text-[12px] font-semibold tracking-tight">
              On this page
            </p>
            <ol className="flex flex-col gap-2.5">
              {post.headings.map((heading, index) => (
                <li key={heading.id} className="flex gap-3">
                  <span className="band-faint font-mono text-[12px]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={`#${heading.id}`}
                    className="band-ink text-[14px] transition-colors hover:text-link"
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="article" dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>

      <button type="button" onClick={onBack} className="mt-16 chevron-link-back text-[14px]">
        Back to the newsroom
      </button>
    </motion.main>
  );
}
