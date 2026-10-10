import { motion } from "framer-motion";
import { STEPS } from "../data";
import { revealUp } from "../motion";
import { useLang } from "../../i18n/context";

function HowItWorks() {
  const { t } = useLang();
  return (
    <section id="how" className="ll-section ll-section-how">
      <div className="ll-container ll-container-6xl">
        <div className="ll-section-head">
          <p className="ll-eyebrow">{t("How it works")}</p>
          <h2 className="ll-h2">{t("Three steps. Zero friction.")}</h2>
        </div>

        <div className="ll-steps">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} {...revealUp(i * 0.1)} className="ll-card ll-step-card">
              <span className="ll-card-orb" aria-hidden="true" />
              <div className="ll-step-icon">
                <Icon size={20} />
              </div>
              <div className="ll-step-num">{t("STEP {n}", { n: `0${i + 1}` })}</div>
              <h3 className="ll-step-title">{t(title)}</h3>
              <p className="ll-step-desc">{t(desc)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
