/**
 * Shared motion vocabulary.
 *
 * One easing curve and three distances, reused everywhere. That constraint is
 * what makes a page feel designed rather than decorated. Apple's whole motion
 * language is essentially one curve applied at different amplitudes.
 */

export const APPLE_EASE = [0.16, 1, 0.3, 1];

export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, ease: APPLE_EASE },
  },
};

export const fadeUpSmall = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: APPLE_EASE },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.9, ease: APPLE_EASE },
  },
};

/**
 * Stagger container. Children animate in sequence rather than as one block,
 * which is the difference between a grid appearing and a grid arriving.
 */
export function staggerParent(stagger = 0.08, delay = 0) {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };
}

/**
 * Viewport settings for a single element reveal. A quarter of it has to be on
 * screen, which stops small items from animating while they are still a sliver
 * at the bottom edge.
 */
export const REVEAL_VIEWPORT = {
  once: true,
  amount: 0.25,
  margin: "0px 0px -80px 0px",
};

/**
 * Viewport settings for a stagger container.
 *
 * This has to be a separate config, and the reason is a bug worth remembering.
 * A percentage threshold is a percentage of the ELEMENT, not the viewport. The
 * bento grid is roughly 1700 pixels tall, so on a 900 pixel viewport it can
 * never have 25 percent of itself on screen at once, the trigger never fires,
 * and every tile inside it stays at opacity zero forever.
 *
 * "some" means any part of the container is enough. Tall containers reveal
 * when their top edge arrives, which is what you want anyway, because the
 * stagger then plays as the reader scrolls into it.
 */
export const REVEAL_VIEWPORT_CONTAINER = {
  once: true,
  amount: "some",
  margin: "0px 0px -80px 0px",
};
