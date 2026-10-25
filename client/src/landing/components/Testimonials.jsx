import { motion } from "framer-motion";
import { SITUATIONS } from "../data";
import { revealUp } from "../motion";
import { useLang } from "../../i18n/context";

/** Real situations LifeLink is built for, and what the app actually does in each one. */
function Testimonials() {
  const { t } = useLang();
  return (
    <section id="stories" className="ll-section ll-section-how">
      <div className="ll-container ll-container-6xl">
        <div className="ll-section-head">
          <p className="ll-eyebrow">{t("Built for real situations")}</p>
          <h2 className="ll-h2">{t("What LifeLink does when it matters.")}</h2>
        </div>

        <div className="ll-testimonials">
          {SITUATIONS.map(({ icon: Icon, tone, title, steps }, i) => (
            <motion.div
              key={title}
              {...revealUp((i % 3) * 0.08, { y: 16, duration: 0.4, margin: "-60px" })}
              className="ll-card ll-situation-card"
            >
              <span className="ll-card-orb ll-card-orb-sm" aria-hidden="true" />
              <span className={`ll-situation-icon ${tone}`}>
                <Icon size={20} />
              </span>
              <h3 className="ll-situation-title">{t(title)}</h3>
              <ol className="ll-situation-steps">
                {steps.map((step) => (
                  <li key={step}>{t(step)}</li>
                ))}
              </ol>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
