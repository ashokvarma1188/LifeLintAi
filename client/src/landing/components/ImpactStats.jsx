import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Counter from "./Counter";
import { getNetworkStats } from "../../services/publicStats";
import { revealUp } from "../motion";
import { useLang } from "../../i18n/context";

// Counted live from the database (demo accounts left out), so every number is real.
const METRICS = [
  { key: "hospitals", label: "Hospitals connected" },
  { key: "responders", label: "Police & fire stations" },
  { key: "sosResolved", label: "SOS alerts resolved" },
  { key: "bloodUnits", label: "Blood units listed now" },
];

function ImpactStats() {
  const { t } = useLang();
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getNetworkStats()
      .then((data) => !cancelled && setImpact(data.impact || null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="impact" className="ll-section">
      <div className="ll-container ll-container-6xl">
        <motion.div {...revealUp(0, { y: 20, duration: 0.5 })} className="ll-glass-card ll-impact">
          <div className="ll-grid-bg ll-impact-grid" aria-hidden="true" />
          <span className="ll-impact-rule" aria-hidden="true" />

          <div className="ll-impact-head">
            <p className="ll-eyebrow">{t("Live impact")}</p>
            <h2 className="ll-h2 ll-h2-sm">{t("Live numbers from the LifeLink network.")}</h2>
          </div>

          <div className="ll-impact-grid-stats">
            {METRICS.map(({ key, label }) => (
              <div key={key} className="ll-stat">
                <div className="ll-stat-value ll-text-gradient-gold">
                  {impact ? <Counter to={impact[key] || 0} suffix="" /> : "—"}
                </div>
                <div className="ll-stat-label">{t(label)}</div>
              </div>
            ))}
          </div>
          <p className="ll-impact-note">{t("Counted live from the database. Demo accounts are not included.")}</p>
        </motion.div>
      </div>
    </section>
  );
}

export default ImpactStats;
