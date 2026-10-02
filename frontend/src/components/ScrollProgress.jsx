import { motion, useScroll, useSpring } from "motion/react";

/**
 * One pixel reading progress line, sitting directly under the product nav.
 *
 * Spring smoothed, because a raw scroll value tracks the wheel exactly and
 * looks nervous. A single flat blue rather than a rainbow gradient: Apple uses
 * one accent at a time, and the line is a progress indicator, not a feature.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 40,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="pointer-events-none fixed inset-x-0 top-[52px] z-50 h-px origin-left bg-link"
      aria-hidden="true"
    />
  );
}
