import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import ImageFrame from "./primitives/ImageFrame.jsx";
import { Glyph } from "../lib/icons.jsx";
import { APPLE_EASE } from "../lib/motion.js";

/**
 * The feature story.
 *
 * Apple never puts their best product in a grid cell. The page runs hero, then
 * one full band per marquee feature, and only then a grid for everything else.
 * This band is that promotion: the flagship project leaves the bento and gets a
 * screen of its own, one headline and one image, nothing competing.
 *
 * The band sits on page white rather than black. The hero above it and the
 * lineup below it are both black, and two dark bands touching would break the
 * alternation that carries the whole page. A dark screenshot on a light ground
 * is also the more Apple arrangement: their product shots sit on white far more
 * often than not.
 *
 * WHAT PINS, AND WHY ONLY THAT
 *
 * The motion is scroll driven rather than entry driven, which is most of what
 * separates a flagship page from a template. A fade up on entry fires once and
 * is over. Here the band is taller than the viewport, the visual pins to the
 * middle of it, and the screenshot scales as a function of how far you have
 * scrolled through, so the reader drives the animation.
 *
 * Only the eyebrow, the headline and the image pin. The first version pinned
 * the metrics and the credit line too, and it broke: the composition was taller
 * than the viewport, so pinning scrolled the headline off the top and left a
 * dead gap under the numbers. Anything that pins has to fit in one screen with
 * room to spare. The image therefore carries a height cap rather than its
 * native ratio, and everything below the visual flows normally after the pin
 * releases.
 *
 * Two more constraints worth recording.
 *
 * The image is capped at 1400 pixels wide rather than running edge to edge. The
 * source screenshots are about 1900 pixels, so a true full bleed image on a
 * retina display would upscale roughly one and a half times and look soft,
 * undercutting the exact impression this band exists to create. A contained
 * image on a full bleed band reads as premium. A blurry one does not.
 *
 * The pin is disabled below the medium breakpoint. A tall sticky section on a
 * phone is a lot of thumb work for one scaling image, so small screens get an
 * ordinary stacked layout.
 */
export default function FeatureBand({ project }) {
  const trackRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start end", "end start"],
  });

  const imageScale = useTransform(
    scrollYProgress,
    [0.12, 0.6],
    reduceMotion ? [1, 1] : [0.88, 1],
  );
  const imageOpacity = useTransform(
    scrollYProgress,
    [0.08, 0.4],
    reduceMotion ? [1, 1] : [0, 1],
  );

  if (!project) return null;

  return (
    <section className="band relative">
      {/* The pinned half. Nothing in here may exceed one screen. */}
      <div ref={trackRef} className="relative md:min-h-[175vh]">
        <div className="px-5 pt-28 sm:px-8 sm:pt-36 md:sticky md:top-[52px] md:flex md:h-[calc(100vh-52px)] md:flex-col md:justify-center md:pt-0">
          <div className="mx-auto w-full max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, ease: APPLE_EASE }}
              className="flex flex-col items-center text-center"
            >
              <span className="band-eyebrow mb-5 inline-flex items-center gap-2.5 text-eyebrow">
                <Glyph name={project.icon} size={19} aria-hidden="true" />
                {project.eyebrow}
              </span>

              <h2 className="band-ink max-w-4xl text-headline font-semibold text-balance">
                {project.title}
              </h2>

              <p className="band-lede mt-6 max-w-2xl text-lede text-pretty">
                {project.summary}
              </p>
            </motion.div>

            {project.media && (
              <motion.div
                style={{ scale: imageScale, opacity: imageOpacity }}
                className="mx-auto mt-10 w-full max-w-[1400px] md:mt-12"
              >
                {/*
                  The height cap is what keeps the pinned composition inside one
                  screen. object-top holds the crop on the dashboard title and the
                  first row of panels, which is the legible part at any size.
                */}
                <ImageFrame
                  media={project.media}
                  ratio="16 / 7"
                  sizes="(min-width: 1440px) 1400px, 92vw"
                  className="band-rule-soft max-h-[40vh] rounded-hero border shadow-[0_30px_90px_-40px_rgba(0,0,0,0.38)]"
                  imgClassName="object-cover object-top"
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Released from the pin. Ordinary flow from here down. */}
      <div className="px-5 pb-28 sm:px-8 sm:pb-36">
        <div className="mx-auto w-full max-w-6xl">
          {project.metrics?.length > 0 && (
            <motion.dl
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, ease: APPLE_EASE }}
              className="mx-auto grid max-w-3xl grid-cols-1 gap-8 text-center sm:grid-cols-3"
            >
              {project.metrics.map((metric) => (
                <div key={metric.label}>
                  <dd className="band-ink text-[28px] font-semibold tracking-[-0.03em]">
                    {metric.value}
                  </dd>
                  <dt className="band-faint mt-1 text-[13px]">{metric.label}</dt>
                </div>
              ))}
            </motion.dl>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-10 flex flex-col items-center gap-4"
          >
            {project.detail && (
              <p className="band-faint max-w-xl text-center text-[13px] leading-relaxed">
                {project.detail}
              </p>
            )}

            {project.repo && (
              <a
                href={project.repo}
                target="_blank"
                rel="noreferrer noopener"
                className="chevron-link text-[15px]"
              >
                View the repository
              </a>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
