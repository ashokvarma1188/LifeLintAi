import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Hospital, Shield, Flame, Pill } from "lucide-react";
import { getNetworkStats } from "../../services/publicStats";
import { revealUp } from "../motion";

const ITEMS = [
  { key: "hospitals", icon: Hospital, label: "Hospitals" },
  { key: "police", icon: Shield, label: "Police stations" },
  { key: "firestation", icon: Flame, label: "Fire stations" },
  { key: "pharmacy", icon: Pill, label: "Pharmacies" },
];

/** Real counts straight from the database — not the aspirational numbers above. */
function LiveNetwork() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getNetworkStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!stats) return null;

  const { counts, hospitalNames } = stats;

  return (
    <div className="ll-container ll-container-6xl ll-live-network-wrap">
      <motion.div {...revealUp(0, { y: 16, duration: 0.4 })} className="ll-live-network">
        <p className="ll-live-network-label">
          <span className="ll-live-dot" aria-hidden="true" /> Live on the network right now
        </p>
        <div className="ll-live-network-counts">
          {ITEMS.map(({ key, icon: Icon, label }) => (
            <div key={key} className="ll-live-network-item">
              <Icon size={16} />
              <span className="ll-live-network-value">{counts[key]}</span>
              <span className="ll-live-network-item-label">{label}</span>
            </div>
          ))}
        </div>
        {hospitalNames?.length > 0 && (
          <p className="ll-live-network-names">
            Including {hospitalNames.slice(0, 4).join(", ")}
            {hospitalNames.length > 4 ? ", and more" : ""}
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default LiveNetwork;
