/**
 * Shared motion presets.
 *
 * Durations, offsets, delays and viewport margins here mirror the reference
 * build one-for-one, so the whole page shares a single motion language instead
 * of each section inventing its own timing.
 */

/** Hero entrance — plays on load, staggered by `delay`. */
export const heroEnter = (delay = 0, { y = 16, duration = 0.7 } = {}) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { duration, delay },
});

/** Scroll reveal — plays once when the element enters the viewport. */
export const revealUp = (delay = 0, { y = 20, duration = 0.5, margin = "-80px" } = {}) => ({
  initial: { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin },
  transition: { duration, delay },
});

/** Horizontal reveal used by the emergency donor rows. */
export const revealFromLeft = (delay = 0, { x = -10 } = {}) => ({
  initial: { opacity: 0, x },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true },
  transition: { delay },
});

/** Scale-in used for the hero's 3D stage. */
export const revealScale = ({ from = 0.95, duration = 0.8 } = {}) => ({
  initial: { opacity: 0, scale: from },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true },
  transition: { duration },
});
