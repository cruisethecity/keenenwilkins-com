import { motion } from "motion/react";
import Reveal from "./primitives/Reveal.jsx";
import { Glyph } from "../lib/icons.jsx";
import { fadeUp, staggerParent, REVEAL_VIEWPORT_CONTAINER } from "../lib/motion.js";

/**
 * The highlights rail. First light band after the black hero, on Apple's
 * section gray with white cards, which is exactly how they set their
 * "Get the highlights" strip.
 *
 * It works because each tile states one fact at a size that cannot be skimmed
 * past, and the supporting sentence stays small and gray. The number does the
 * talking, the sentence only qualifies it.
 *
 * On narrow screens this becomes a horizontal snap scroller rather than a
 * stack, which is what Apple does and what keeps the numbers large on a phone
 * instead of shrinking them to fit four across.
 */
export default function HighlightRail({ highlights }) {
  return (
    <section className="band band--gray px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal
          as="h2"
          className="band-ink mb-10 text-title font-semibold tracking-[-0.03em]"
        >
          Get the highlights.
        </Reveal>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={REVEAL_VIEWPORT_CONTAINER}
          variants={staggerParent(0.09)}
          className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
        >
          {highlights.map((item) => (
            <motion.li
              key={item.id}
              variants={fadeUp}
              className="band-card group flex min-w-[76vw] shrink-0 snap-center flex-col rounded-tile p-6 sm:min-w-0"
            >
              <Glyph
                name={item.icon}
                size={18}
                className="band-link mb-6 transition-transform duration-500 group-hover:scale-110"
                aria-hidden="true"
              />

              <p className="flex items-baseline gap-1">
                <span className="band-ink text-stat font-semibold tracking-[-0.04em]">
                  {item.value}
                </span>
                {item.unit && (
                  <span className="band-muted text-xl font-medium">
                    {item.unit}
                  </span>
                )}
              </p>

              <p className="band-ink mt-2 text-[15px] font-medium tracking-tight">
                {item.label}
              </p>

              <p className="band-muted mt-3 text-[13px] leading-relaxed">
                {item.detail}
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
