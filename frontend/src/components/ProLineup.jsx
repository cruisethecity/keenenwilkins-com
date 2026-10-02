import { motion } from "motion/react";
import Section from "./primitives/Section.jsx";
import ImageFrame from "./primitives/ImageFrame.jsx";
import { Glyph } from "../lib/icons.jsx";
import { fadeUp, staggerParent, REVEAL_VIEWPORT_CONTAINER } from "../lib/motion.js";

/**
 * The lineup, on a black band, which is where Apple puts their own product
 * grid: dark ground, cards a shade lighter, generous corner radius.
 *
 * WHY THIS IS TWO EVEN ROWS AND NOT A BENTO
 *
 * The first version was a three column bento with per project span classes:
 * one tile two wide, one tile two tall, the rest single cells. Bento grids
 * only look deliberate when the tile count and the span sizes happen to tile
 * the rectangle exactly. Ours never did. Four projects across three columns
 * with two spans left a hole in the last row, and because only half the
 * projects carry a screenshot the tiles in a shared row were wildly different
 * heights. The result read as leftovers arranged around a gap.
 *
 * So the spans are gone. This is one two column grid, and the only thing that
 * decides a tile's place is whether the project has a screenshot to show.
 *
 *   Row one   the projects with dashboards. The image carries the tile.
 *   Row two   the projects without. Shorter tiles, same width.
 *
 * Two consequences worth stating, because they are the reason this holds up
 * when the content changes.
 *
 * A CSS grid stretches items to match the tallest item IN THEIR OWN ROW, not
 * across the whole grid. Grouping the two image tiles into one row and the two
 * plain tiles into another therefore makes every row self levelling. Nothing
 * needs a fixed height, and no tile has to be padded out to match a neighbour
 * it has nothing in common with.
 *
 * The two dashboard screenshots are 1.84 and 1.82 to one, near enough to
 * identical that their frames land on the same height with no crop. That is
 * luck rather than design, so ImageFrame still reserves the box from the
 * intrinsic size and the row would simply level itself if a future screenshot
 * came in at a different ratio.
 *
 * Tile size follows the content. It is not assigned.
 */

// Accent hues stay in the family Apple uses on dark product pages. They tint
// the icon chip and the hover wash, never the body copy.
const ACCENTS = {
  signal: "text-signal-dark",
  glow: "text-link-dark",
  amber: "text-amber-dark",
  violet: "text-[#bf5af2]",
  muted: "band-muted",
};

function ProjectTile({ project }) {
  const accent = ACCENTS[project.accent] ?? ACCENTS.glow;
  const hasMedia = Boolean(project.media);

  // Each tile deep links to its own repository, verified against the live
  // account rather than assumed. A tile with no repo shows no link at all.
  // Pointing it at the profile instead would send a reviewer looking for one
  // project into a list of thirty three, most of them coursework, which is
  // worse than offering nothing.
  const repo = project.repo ?? null;

  return (
    <motion.li
      variants={fadeUp}
      className="band-card group relative overflow-hidden rounded-hero"
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/6 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="relative flex h-full flex-col p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 ${accent}`}
          >
            <Glyph name={project.icon} size={18} aria-hidden="true" />
          </span>

          <span className="band-muted band-rule rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-tight">
            {project.status}
          </span>
        </div>

        <p className={`mb-2 text-[12px] font-semibold tracking-tight ${accent}`}>
          {project.eyebrow}
        </p>

        <h3
          className={`band-ink font-semibold tracking-[-0.03em] ${
            hasMedia ? "text-[26px] leading-tight" : "text-xl"
          }`}
        >
          {/*
            The link sits on the title, not on a transparent anchor stretched
            across the whole tile. A full card overlay is a common pattern and
            a bad one: every word in the card becomes unselectable, and a
            screen reader announces one link named after the entire tile.
          */}
          {repo ? (
            <a
              href={repo}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-sm transition-colors duration-300 hover:text-link-dark"
            >
              {project.title}
            </a>
          ) : (
            project.title
          )}
        </h3>

        <p
          className={`band-muted mt-3 leading-relaxed ${
            hasMedia ? "text-[15px]" : "text-[14px]"
          }`}
        >
          {project.summary}
        </p>

        {project.detail && (
          <p className="band-faint mt-3 text-[13px] leading-relaxed">
            {project.detail}
          </p>
        )}

        {/*
          The screenshot is the proof. Apple's product tiles hold product
          photography, and on a page about infrastructure the equivalent is the
          dashboard the work actually produced.

          No ratio override here. At two columns the frame is wide enough to
          carry each screenshot at its native shape, so nothing is cropped and
          nothing is upscaled past its source width.
        */}
        {project.media && (
          <ImageFrame
            media={project.media}
            sizes="(min-width: 768px) 520px, 88vw"
            className="band-rule-soft mt-6 rounded-xl border"
          />
        )}

        {project.metrics?.length > 0 && (
          <dl
            className={`mt-6 grid gap-4 ${
              project.metrics.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"
            }`}
          >
            {project.metrics.map((metric) => (
              <div key={metric.label} className="band-rule border-l pl-3">
                <dt className="band-faint text-[11px] tracking-tight">
                  {metric.label}
                </dt>
                <dd className="band-ink mt-0.5 text-[15px] font-semibold tracking-tight">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <ul className="mt-auto flex flex-wrap gap-1.5 pt-7">
          {project.stack.map((tool) => (
            <li
              key={tool}
              className="band-chip rounded-md px-2 py-1 font-mono text-[11px]"
            >
              {tool}
            </li>
          ))}
        </ul>

        {repo && (
          <a
            href={repo}
            target="_blank"
            rel="noreferrer noopener"
            className="chevron-link mt-5 text-[13px]"
          >
            View the repository
          </a>
        )}
      </div>
    </motion.li>
  );
}

export default function ProLineup({ projects }) {
  // Order is derived, not authored. Whoever edits resumeData.json next does
  // not have to know that the rows are grouped by whether a screenshot exists,
  // and cannot break the layout by adding a project in the wrong place.
  const ordered = [
    ...projects.filter((project) => project.media),
    ...projects.filter((project) => !project.media),
  ];

  return (
    <Section
      id="work"
      tone="dark"
      eyebrow="The lineup"
      title="Four more, same throughline."
      lede="Every one of these reached a live environment, took real traffic or real attacker traffic, and taught me something a course could not."
    >
      <motion.ul
        initial="hidden"
        whileInView="visible"
        viewport={REVEAL_VIEWPORT_CONTAINER}
        variants={staggerParent(0.08)}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {ordered.map((project) => (
          <ProjectTile key={project.id} project={project} />
        ))}
      </motion.ul>
    </Section>
  );
}
