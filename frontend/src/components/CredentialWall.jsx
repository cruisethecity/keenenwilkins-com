import { motion } from "motion/react";
import Section from "./primitives/Section.jsx";
import { Glyph } from "../lib/icons.jsx";
import { fadeUp, staggerParent, REVEAL_VIEWPORT_CONTAINER } from "../lib/motion.js";

/**
 * Credentials, on the page white band.
 *
 * Earned and in progress are visually distinct, and in progress is never
 * dressed up to look earned. That honesty costs nothing on a page and buys a
 * lot of credibility in the conversation that follows.
 *
 * The status badge is the only place green appears on a light band, and it is
 * Apple's darker green rather than the bright one, because the bright green
 * fails contrast on white.
 */
function CredentialCard({ title, subtitle, status, icon }) {
  const earned = status === "Earned";

  return (
    <motion.li
      variants={fadeUp}
      className="band-card group flex flex-col rounded-tile p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
            earned ? "bg-link/10 band-link" : "band-chip"
          }`}
        >
          <Glyph name={icon} size={17} aria-hidden="true" />
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-tight ${
            earned
              ? "bg-signal/10 band-signal"
              : "band-rule band-muted border"
          }`}
        >
          {earned && (
            <span
              className="bg-signal h-1.5 w-1.5 rounded-full"
              aria-hidden="true"
            />
          )}
          {status}
        </span>
      </div>

      <h3 className="band-ink text-[16px] leading-snug font-semibold tracking-tight">
        {title}
      </h3>

      <p className="band-muted mt-1.5 text-[13px]">{subtitle}</p>
    </motion.li>
  );
}

export default function CredentialWall({ credentials }) {
  return (
    <Section
      id="credentials"
      tone="light"
      eyebrow="Credentials"
      title="Certified, and still studying."
      lede="Five certifications earned, a sixth in flight, and a cloud and network engineering degree underway."
    >
      <motion.ul
        initial="hidden"
        whileInView="visible"
        viewport={REVEAL_VIEWPORT_CONTAINER}
        variants={staggerParent(0.07)}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {credentials.certifications.map((item) => (
          <CredentialCard
            key={item.name}
            title={item.name}
            subtitle={item.issuer}
            status={item.status}
            icon={item.icon}
          />
        ))}
      </motion.ul>

      <motion.ul
        initial="hidden"
        whileInView="visible"
        viewport={REVEAL_VIEWPORT_CONTAINER}
        variants={staggerParent(0.07, 0.1)}
        className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {credentials.education.map((item) => (
          <CredentialCard
            key={item.institution}
            title={item.credential}
            subtitle={item.institution}
            status={item.status}
            icon={item.icon}
          />
        ))}
      </motion.ul>
    </Section>
  );
}
