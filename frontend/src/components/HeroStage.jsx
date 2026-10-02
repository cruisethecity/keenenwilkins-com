import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { MapPin } from "lucide-react";
import { APPLE_EASE } from "../lib/motion.js";

/**
 * The hero stage. A black band, which is how every Apple flagship page opens
 * before the layout drops into the light spec bands below it.
 *
 * The whole effect is the scale jump between two pieces of text. A headline
 * near seven rem over a subhead near one and a half reads as confidence. The
 * same headline at three rem reads as a resume.
 *
 * Tracking is negative and has to be. At display sizes the default letter
 * spacing looks loose and unfinished, which is why every Apple headline sits
 * somewhere near minus four percent.
 *
 * The action pair is Apple's, not a generic button row: one filled blue pill
 * for the thing you want people to do, and one blue text link with a chevron
 * beside it. Two filled buttons of equal weight is the tell of a page that
 * has not decided what it wants.
 */
export default function HeroStage({ hero, meta, onNavigate }) {
  const stageRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start start", "end start"],
  });

  // Small amplitude on purpose. Aggressive parallax on a text hero makes it
  // unreadable on the way past.
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -80]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, reduceMotion ? 1 : 0]);

  return (
    <section
      id="overview"
      ref={stageRef}
      className="band band--dark relative flex min-h-[86svh] items-center justify-center overflow-hidden px-5 pt-20 pb-24 sm:px-8"
    >
      {/* Ambient light. One soft wash behind the type at low opacity, enough
          to keep pure black from looking dead without becoming a graphic. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-[-25%] left-1/2 h-[65vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(41,151,255,0.14),transparent_60%)] blur-3xl" />
      </div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: APPLE_EASE }}
          className="band-muted mb-7 inline-flex items-center gap-2 text-[13px] font-medium"
        >
          <MapPin size={13} aria-hidden="true" />
          {meta.location}
          {/* Dropped on the narrowest screens rather than allowed to wrap. */}
          <span className="band-faint hidden sm:inline">·</span>
          <span className="hidden sm:inline">{meta.discipline}</span>
        </motion.p>

        <h1 className="band-ink text-display font-semibold tracking-[-0.045em] text-balance">
          {hero.headline.map((line, index) => (
            <motion.span
              key={line}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 1.1,
                delay: 0.1 + index * 0.14,
                ease: APPLE_EASE,
              }}
              className="block"
            >
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: APPLE_EASE }}
          className="band-muted mt-7 max-w-2xl text-lede text-pretty"
        >
          {hero.subheadline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.54, ease: APPLE_EASE }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-7"
        >
          <a
            href={meta.resumePath}
            download
            className="pill px-6 py-3 text-[17px]"
          >
            Download resume
          </a>

          <button
            type="button"
            onClick={() => onNavigate("work")}
            className="chevron-link text-[17px]"
          >
            See the work
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.9 }}
          className="band-faint mt-14 max-w-xl text-[12px] leading-relaxed"
        >
          {hero.footnote}
          {/*
            A real footnote marker, not decoration. It points at note three in
            the footer, which is where the claim about Terraform and keyless
            deploys is actually substantiated. Apple uses this apparatus to keep
            a bold line in the body and the caveat out of the way.
          */}
          <a
            href="#note-3"
            className="band-link ml-0.5 align-super text-[10px] no-underline"
            aria-label="See footnote three"
          >
            3
          </a>
        </motion.p>
      </motion.div>
    </section>
  );
}
