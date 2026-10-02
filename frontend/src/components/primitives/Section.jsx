import { motion } from "motion/react";
import Reveal from "./Reveal.jsx";
import { fadeUp, fadeUpSmall, staggerParent, REVEAL_VIEWPORT } from "../../lib/motion.js";

/**
 * Standard section shell, and the thing that makes the band rhythm work.
 *
 * An Apple product page is a stack of full bleed bands that alternate page
 * white, section gray and pure black. This component owns that: pass a tone
 * and it paints the ground and declares the semantic color variables the
 * content inside will inherit, so nothing below has to know which ground it
 * is sitting on.
 *
 * The header block is Apple's fixed rhythm, in this order every time: a small
 * blue eyebrow, one large headline with tight negative tracking, then an
 * optional muted lede. No gradients on the headline. Apple sets theirs in
 * flat ink, and at these sizes flat is what reads as confident.
 */

const TONES = {
  light: "band",
  gray: "band band--gray",
  dark: "band band--dark",
};

export default function Section({
  id,
  tone = "light",
  eyebrow,
  title,
  lede,
  align = "center",
  className = "",
  containerClassName = "",
  children,
}) {
  const alignment =
    align === "left" ? "items-start text-left" : "items-center text-center";

  return (
    <section
      id={id}
      className={`${TONES[tone] ?? TONES.light} px-5 py-28 sm:px-8 sm:py-40 ${className}`}
    >
      <div className={`mx-auto max-w-6xl ${containerClassName}`}>
        {(eyebrow || title || lede) && (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={REVEAL_VIEWPORT}
            variants={staggerParent(0.1)}
            className={`mb-16 flex flex-col gap-5 sm:mb-24 ${alignment}`}
          >
            {eyebrow && (
              <Reveal
                as="p"
                variants={fadeUpSmall}
                className="band-link text-[13px] font-semibold tracking-tight"
              >
                {eyebrow}
              </Reveal>
            )}

            {title && (
              <Reveal
                as="h2"
                variants={fadeUp}
                className="band-ink max-w-4xl text-headline font-semibold tracking-[-0.035em] text-balance"
              >
                {title}
              </Reveal>
            )}

            {lede && (
              <Reveal
                as="p"
                variants={fadeUpSmall}
                className="band-muted max-w-2xl text-lede text-pretty"
              >
                {lede}
              </Reveal>
            )}
          </motion.div>
        )}

        {children}
      </div>
    </section>
  );
}
