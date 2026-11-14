import { motion } from "motion/react";
import Section from "./primitives/Section.jsx";
import { fadeUp, staggerParent, REVEAL_VIEWPORT_CONTAINER } from "../lib/motion.js";

/**
 * Experience, on the section gray band.
 *
 * The date range is set larger and lighter than the role title, which inverts
 * the usual resume hierarchy on purpose. On a portfolio page the reader is
 * scanning for a timeline first and titles second, and the oversized muted
 * year gives each row an anchor on the left.
 *
 * The bullet dot is a one pixel square rather than a list marker, and it sits
 * on the text baseline. Apple never uses a browser bullet, and matching that
 * is most of why a plain list can look composed.
 */
export default function ExperienceRail({ experience }) {
  return (
    <Section
      id="experience"
      tone="gray"
      eyebrow="Track record"
      title="Ten years of owning outcomes."
      lede="Eight on a retail floor where the plan meets reality before nine in the morning, two in a regulated B2B territory, and the two since spent turning that operating discipline into cloud and security work."
    >
      <motion.ol
        initial="hidden"
        whileInView="visible"
        viewport={REVEAL_VIEWPORT_CONTAINER}
        variants={staggerParent(0.12)}
        className="flex flex-col"
      >
        {experience.map((role) => (
          <motion.li
            key={role.id}
            variants={fadeUp}
            className="band-rule grid gap-5 border-t py-10 sm:grid-cols-[minmax(150px,200px)_1fr] sm:gap-12"
          >
            <div>
              <p className="band-muted font-mono text-[15px] tracking-tight">
                {role.dateRange}
              </p>
              <p className="band-faint mt-1 text-[13px]">{role.location}</p>
            </div>

            <div>
              <h3 className="band-ink text-title font-semibold">
                {role.role}
              </h3>

              <p className="band-link mt-1 text-[15px] font-medium">
                {role.company}
              </p>

              <p className="band-ink mt-4 text-[17px] leading-[1.47]">
                {role.summary}
              </p>

              <ul className="mt-5 flex flex-col gap-3">
                {role.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="band-muted relative pl-5 text-[17px] leading-[1.47]"
                  >
                    <span
                      className="bg-link absolute top-[0.65em] left-0 h-1 w-1 rounded-full"
                      aria-hidden="true"
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </motion.li>
        ))}
      </motion.ol>
    </Section>
  );
}
