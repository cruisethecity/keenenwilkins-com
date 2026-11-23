import { motion } from "motion/react";
import { Clock } from "lucide-react";
import Section from "./primitives/Section.jsx";
import { fadeUp, staggerParent, REVEAL_VIEWPORT_CONTAINER } from "../lib/motion.js";

/**
 * The Newsroom, on the section gray band with white cards.
 *
 * One feed, two sources. Markdown files in the repository open in the reader
 * view on this site. Posts published on dev.to link out, because that is where
 * they are canonical and copying them here would mean two URLs competing for
 * the same article.
 *
 * The only visual difference is a small source label and the fact that an
 * external card is an anchor rather than a button. Everything else is
 * identical, so the section reads as one body of writing rather than two.
 *
 * The first card is deliberately larger. A newsroom with six identical tiles
 * has no editorial voice, and Apple's own newsroom leads with one story at
 * double the size of the rest.
 */

function Meta({ post, size = "small" }) {
  const text = size === "large" ? "text-[12px]" : "text-[12px]";

  return (
    <div className={`band-faint mb-4 flex flex-wrap items-center gap-3 ${text}`}>
      <span
        className={
          size === "large"
            ? "bg-link/10 band-link rounded-full px-2.5 py-1 font-medium"
            : "band-muted font-medium"
        }
      >
        {post.category}
      </span>
      <span>{post.displayDate}</span>
      <span className="inline-flex items-center gap-1.5">
        <Clock size={12} aria-hidden="true" />
        {post.readingMinutes} min{size === "large" ? " read" : ""}
      </span>
      {post.isExternal && (
        <span className="band-chip rounded px-1.5 py-0.5 font-mono text-[10px] tracking-tight">
          {post.source}
        </span>
      )}
    </div>
  );
}

/** Anchor for an external post, button for a local one. Same everything else. */
function CardShell({ post, onOpenArticle, className, children }) {
  if (post.isExternal) {
    return (
      <a
        href={post.url}
        target="_blank"
        rel="noreferrer noopener"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenArticle(post.slug)}
      className={className}
    >
      {children}
    </button>
  );
}

export default function Newsroom({ posts, onOpenArticle }) {
  if (posts.length === 0) {
    return null;
  }

  const [lead, ...rest] = posts;

  return (
    <Section
      id="newsroom"
      tone="gray"
      eyebrow="Newsroom"
      title="Write ups from the build."
      lede="What broke, why it broke, and the decision I would make again."
    >
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={REVEAL_VIEWPORT_CONTAINER}
        variants={staggerParent(0.09)}
        className="flex flex-col gap-5"
      >
        <motion.article
          variants={fadeUp}
          className="band-card group overflow-hidden rounded-hero"
        >
          <CardShell
            post={lead}
            onOpenArticle={onOpenArticle}
            className="flex w-full flex-col items-start p-7 text-left sm:p-10"
          >
            <Meta post={lead} size="large" />

            <h3 className="band-ink max-w-3xl text-title font-semibold">
              {lead.title}
            </h3>

            <p className="band-muted mt-4 max-w-2xl text-[16px] leading-relaxed">
              {lead.summary}
            </p>

            <span className="chevron-link mt-7 text-[14px]">
              {lead.isExternal ? `Read on ${lead.source}` : "Read the write up"}
            </span>
          </CardShell>
        </motion.article>

        {rest.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {rest.map((post) => (
              <motion.article
                key={post.id ?? post.slug}
                variants={fadeUp}
                className="band-card group rounded-tile"
              >
                <CardShell
                  post={post}
                  onOpenArticle={onOpenArticle}
                  className="flex h-full w-full flex-col items-start p-6 text-left"
                >
                  <Meta post={post} />

                  <h3 className="band-ink text-[18px] leading-snug font-semibold tracking-[-0.02em]">
                    {post.title}
                  </h3>

                  <p className="band-muted mt-3 text-[14px] leading-relaxed">
                    {post.summary}
                  </p>

                  <span className="chevron-link mt-auto pt-6 text-[13px]">
                    {post.isExternal ? `Read on ${post.source}` : "Read"}
                  </span>
                </CardShell>
              </motion.article>
            ))}
          </div>
        )}
      </motion.div>
    </Section>
  );
}
