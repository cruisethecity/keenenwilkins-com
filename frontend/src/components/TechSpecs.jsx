import { motion } from "motion/react";
import Section from "./primitives/Section.jsx";
import { fadeUpSmall, staggerParent, REVEAL_VIEWPORT_CONTAINER } from "../lib/motion.js";

/**
 * Tech specs, on the page white band.
 *
 * Modeled on Apple's specification pages, which are the least decorated and
 * most readable part of their whole site: a narrow gray label column, a wide
 * content column, and a hairline between every row. No cards, no icons, no
 * shadows, no fills. The restraint is the point, and it is also the fastest
 * way for a hiring manager to scan for one keyword.
 *
 * On the light ground the hairline does more work than it does on black, so
 * it uses Apple's #d2d2d7 rather than a tinted gray. That single value is
 * most of why their spec tables look printed rather than rendered.
 */
export default function TechSpecs({ specs }) {
  return (
    <Section
      id="specs"
      tone="light"
      eyebrow="Tech specs"
      title="What I actually work in."
      lede="Listed at the depth I can defend in a whiteboard conversation, not the depth I once read about."
    >
      <motion.dl
        initial="hidden"
        whileInView="visible"
        viewport={REVEAL_VIEWPORT_CONTAINER}
        variants={staggerParent(0.06)}
        className="band-rule border-t"
      >
        {specs.map((spec) => (
          <motion.div
            key={spec.group}
            variants={fadeUpSmall}
            className="band-rule grid gap-2 border-b py-7 sm:grid-cols-[minmax(180px,240px)_1fr] sm:gap-10"
          >
            <dt className="band-muted text-[15px] font-semibold tracking-tight">
              {spec.group}
            </dt>

            <dd>
              <ul className="flex flex-col gap-2.5">
                {spec.items.map((item) => (
                  <li
                    key={item}
                    className="band-ink text-[15px] leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </dd>
          </motion.div>
        ))}
      </motion.dl>
    </Section>
  );
}
