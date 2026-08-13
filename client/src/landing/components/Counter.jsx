import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useTransform, useReducedMotion } from "framer-motion";

/**
 * Counts up to `to` when scrolled into view, once. The value lives in a motion
 * value rather than state, so the tween never re-renders React.
 */
function Counter({ to, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reducedMotion = useReducedMotion();

  const count = useMotionValue(0);
  const display = useTransform(count, (value) => Math.floor(value).toLocaleString());

  useEffect(() => {
    if (!inView) return undefined;
    if (reducedMotion) {
      count.set(to);
      return undefined;
    }
    const controls = animate(count, to, { duration: 2, ease: "easeOut" });
    return controls.stop;
  }, [inView, to, count, reducedMotion]);

  return (
    <span ref={ref} className="ll-tabular">
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

export default Counter;
