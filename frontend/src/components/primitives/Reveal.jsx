import { motion } from "motion/react";
import { fadeUp, REVEAL_VIEWPORT } from "../../lib/motion.js";

/**
 * Scroll reveal wrapper. One component so every section on the page enters
 * with identical timing, and so the viewport threshold is tuned in exactly
 * one place.
 */
export default function Reveal({
  as = "div",
  variants = fadeUp,
  className = "",
  children,
  ...rest
}) {
  const Component = motion[as] ?? motion.div;

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={REVEAL_VIEWPORT}
      variants={variants}
      className={className}
      {...rest}
    >
      {children}
    </Component>
  );
}
