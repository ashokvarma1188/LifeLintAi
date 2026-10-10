import { motion } from "framer-motion";
import { TRUST_BADGES } from "../data";
import { revealUp } from "../motion";
import { useLang } from "../../i18n/context";

function TrustBadges() {
  const { t } = useLang();
  return (
    <div className="ll-container ll-container-6xl ll-trust-badges-wrap">
      <div className="ll-trust-badges">
        {TRUST_BADGES.map(({ icon: Icon, label }, i) => (
          <motion.div key={label} {...revealUp(i * 0.08, { y: 10, duration: 0.4 })} className="ll-trust-badge">
            <Icon size={16} />
            <span>{t(label)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default TrustBadges;
