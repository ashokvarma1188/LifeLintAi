import { motion } from "framer-motion";
import Counter from "./Counter";
import { STATS } from "../data";
import { revealUp } from "../motion";

function ImpactStats() {
  return (
    <section id="impact" className="ll-section">
      <div className="ll-container ll-container-6xl">
        <motion.div {...revealUp(0, { y: 20, duration: 0.5 })} className="ll-glass-card ll-impact">
          <div className="ll-grid-bg ll-impact-grid" aria-hidden="true" />
          <span className="ll-impact-rule" aria-hidden="true" />

          <div className="ll-impact-head">
            <p className="ll-eyebrow">Live impact</p>
            <h2 className="ll-h2 ll-h2-sm">Real numbers. Real lives.</h2>
          </div>

          <div className="ll-impact-grid-stats">
            {STATS.map((stat) => (
              <div key={stat.label} className="ll-stat">
                <div className="ll-stat-value ll-text-gradient-success">
                  <Counter to={stat.value} suffix={stat.suffix} />
                </div>
                <div className="ll-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default ImpactStats;
