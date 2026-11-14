import { motion } from "motion/react";
import Reveal from "./primitives/Reveal.jsx";
import ImageFrame from "./primitives/ImageFrame.jsx";
import { Glyph } from "../lib/icons.jsx";
import { fadeUp, staggerParent, REVEAL_VIEWPORT_CONTAINER } from "../lib/motion.js";

/**
 * Closing call to action, back on black so the page ends where it started.
 *
 * Apple closes every product page with one line, one button, and a lot of
 * empty space. The white space is what makes the ask read as confident rather
 * than desperate, so the vertical padding here is the largest on the page and
 * there is exactly one primary action.
 */
export default function ContactBand({ contact, meta }) {
  return (
    <section
      id="contact"
      className="band band--dark relative overflow-hidden px-5 py-28 sm:px-8 sm:py-40"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-[-45%] h-[70vh] bg-[radial-gradient(ellipse_at_center,rgba(41,151,255,0.12),transparent_62%)] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        {/*
          The portrait belongs here and not in the hero. The hero belongs to
          the headline. A face at the point where someone decides whether to
          reach out is the one place on a resume page it earns its space.
        */}
        {contact.portrait && (
          <Reveal className="mb-8">
            <ImageFrame
              media={contact.portrait}
              sizes="88px"
              className="band-rule h-[88px] w-[88px] rounded-full border"
              imgClassName="object-cover"
            />
          </Reveal>
        )}

        <Reveal
          as="h2"
          className="band-ink text-headline font-semibold text-balance"
        >
          {contact.headline}
        </Reveal>

        <Reveal as="p" className="band-lede mt-6 max-w-xl text-lede text-pretty">
          {contact.subheadline}
        </Reveal>

        <Reveal className="mt-10">
          <a href={meta.resumePath} download className="pill px-[22px] py-3 text-[17px]">
            Download resume
          </a>
        </Reveal>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={REVEAL_VIEWPORT_CONTAINER}
          variants={staggerParent(0.08, 0.15)}
          className="mt-16 grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {contact.cards.map((card) => {
            const external = card.href.startsWith("http");

            return (
              <motion.li key={card.id} variants={fadeUp}>
                <a
                  href={card.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer noopener" : undefined}
                  className="band-card group flex h-full flex-col items-start gap-4 rounded-tile p-5 text-left"
                >
                  <span className="band-link inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/8">
                    <Glyph name={card.icon} size={16} aria-hidden="true" />
                  </span>

                  <span className="flex flex-col">
                    <span className="band-faint text-[12px]">{card.label}</span>
                    <span className="band-ink mt-0.5 text-[14px] font-medium tracking-tight">
                      {card.value}
                    </span>
                  </span>
                </a>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
