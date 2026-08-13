import { useEffect, useState } from "react";

/**
 * Scroll-spy. Returns the index of the section closest to the top of the
 * viewport, used to park the navbar capsule under the current section.
 *
 * A single IntersectionObserver drives this — no scroll handler, no per-frame
 * layout reads.
 */
export default function useActiveSection(ids, { offset = "-45% 0px -50% 0px" } = {}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const elements = ids
      .map((id, index) => ({ index, el: document.getElementById(id) }))
      .filter((entry) => entry.el);

    if (!elements.length) return undefined;

    const visible = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const match = elements.find((e) => e.el === entry.target);
          if (!match) return;
          if (entry.isIntersecting) visible.set(match.index, entry.intersectionRatio);
          else visible.delete(match.index);
        });

        if (visible.size) {
          setActive(Math.min(...visible.keys()));
        }
      },
      { rootMargin: offset, threshold: 0 }
    );

    elements.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids, offset]);

  return active;
}
