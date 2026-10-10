import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dashboardShot from "../assets/showcase-dashboard.png";
import findHospitalsShot from "../assets/showcase-find-hospitals.png";
import bloodDonationShot from "../assets/showcase-blood-donation.png";
import { revealUp } from "../motion";
import { useLang } from "../../i18n/context";

/* Real screenshots of the actual running app, not mockups. */
const SCREENS = [
  { key: "dashboard", label: "Dashboard", src: dashboardShot },
  { key: "hospitals", label: "Find Hospitals", src: findHospitalsShot },
  { key: "blood", label: "Blood Donation", src: bloodDonationShot },
];

function AppShowcase() {
  const { t } = useLang();
  const [active, setActive] = useState(0);

  return (
    <section id="showcase" className="ll-section ll-section-how">
      <div className="ll-container ll-container-6xl">
        <div className="ll-section-head">
          <p className="ll-eyebrow">{t("See it for real")}</p>
          <h2 className="ll-h2">{t("Not a mockup. The actual app.")}</h2>
        </div>

        <div className="ll-showcase-tabs">
          {SCREENS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`ll-showcase-tab${i === active ? " is-active" : ""}`}
              onClick={() => setActive(i)}
            >
              {t(s.label)}
            </button>
          ))}
        </div>

        <motion.div {...revealUp(0, { y: 24, duration: 0.5 })} className="ll-browser-frame">
          <div className="ll-browser-bar">
            <span className="ll-browser-dot ll-browser-dot-red" />
            <span className="ll-browser-dot ll-browser-dot-yellow" />
            <span className="ll-browser-dot ll-browser-dot-green" />
            <span className="ll-browser-url">lifelinkai-app.vercel.app</span>
          </div>
          <div className="ll-browser-body">
            <AnimatePresence mode="wait">
              <motion.img
                key={SCREENS[active].key}
                src={SCREENS[active].src}
                alt={t("LifeLink AI — {screen} screen", { screen: t(SCREENS[active].label) })}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="ll-browser-screenshot"
              />
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default AppShowcase;
