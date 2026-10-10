import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ROLES } from "../data";
import { revealUp } from "../motion";
import { useLang } from "../../i18n/context";

function RoleShowcase() {
  const { t } = useLang();
  return (
    <section id="roles" className="ll-section ll-section-how">
      <div className="ll-container ll-container-6xl">
        <div className="ll-section-head">
          <p className="ll-eyebrow">{t("Built for everyone in the chain")}</p>
          <h2 className="ll-h2">{t("Which one are you?")}</h2>
        </div>

        <div className="ll-roles">
          {ROLES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} {...revealUp((i % 5) * 0.07, { y: 16, duration: 0.4, margin: "-60px" })}>
              <Link to="/signup" className="ll-card ll-role-card">
                <span className="ll-card-orb ll-card-orb-sm" aria-hidden="true" />
                <div className="ll-role-icon">
                  <Icon size={22} />
                </div>
                <h3 className="ll-role-title">{t(title)}</h3>
                <p className="ll-role-desc">{t(desc)}</p>
                <span className="ll-role-link">
                  {t("Join as {role}", { role: t(title) })} <ArrowRight size={14} />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default RoleShowcase;
