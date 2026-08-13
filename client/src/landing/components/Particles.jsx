import { useMemo } from "react";
import { PARTICLE_SYMBOLS } from "../data";
import { createRandom } from "../random";

/**
 * Ambient page-wide glyph drift. Positions are randomised once per mount and
 * then handed to CSS — the animation itself never touches React, so this costs
 * nothing per frame.
 */
function Particles({ count = 18 }) {
  const particles = useMemo(() => {
    const random = createRandom(0x11fe11 + count);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      symbol: PARTICLE_SYMBOLS[i % PARTICLE_SYMBOLS.length],
      size: 8 + random() * 14,
      x: random() * 100,
      delay: random() * 25,
      duration: 20 + random() * 20,
      opacity: 0.03 + random() * 0.06,
      drift: -30 + random() * 60,
    }));
  }, [count]);

  return (
    <div className="ll-particles" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="ll-particle"
          style={{
            left: `${p.x}%`,
            fontSize: `${p.size}px`,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--ll-drift": `${p.drift}px`,
            "--ll-particle-opacity": p.opacity,
            color: p.symbol === "♥" || p.symbol === "💧" ? "var(--ll-emergency)" : "var(--ll-primary)",
          }}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  );
}

export default Particles;
