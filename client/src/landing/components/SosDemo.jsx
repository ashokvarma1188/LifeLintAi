import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Siren, Check, Loader2 } from "lucide-react";
import { SOS_DEMO_STEPS } from "../data";
import { revealUp } from "../motion";
import { useLang } from "../../i18n/context";

const STEP_DELAY_MS = 900;

/** A harmless, client-only simulation — no request is actually sent. Just shows what pressing SOS looks like. */
function SosDemo() {
  const { t } = useLang();
  const [activeStep, setActiveStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const timeoutsRef = useRef([]);

  const clearTimers = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const run = () => {
    clearTimers();
    setRunning(true);
    setActiveStep(0);
    SOS_DEMO_STEPS.forEach((_, i) => {
      if (i === 0) return;
      const id = setTimeout(() => setActiveStep(i), i * STEP_DELAY_MS);
      timeoutsRef.current.push(id);
    });
    const doneId = setTimeout(() => setRunning(false), SOS_DEMO_STEPS.length * STEP_DELAY_MS);
    timeoutsRef.current.push(doneId);
  };

  return (
    <section id="sos-demo" className="ll-section ll-section-how">
      <div className="ll-container ll-container-5xl">
        <div className="ll-section-head">
          <p className="ll-eyebrow">{t("See it in action")}</p>
          <h2 className="ll-h2">{t("Press it. Watch what happens.")}</h2>
        </div>

        <motion.div {...revealUp(0, { y: 20, duration: 0.5 })} className="ll-card ll-sos-demo-card">
          <span className="ll-card-orb" aria-hidden="true" />

          <button type="button" className="ll-sos-demo-btn" onClick={run} disabled={running}>
            {running ? <Loader2 size={20} className="ll-sos-demo-spin" /> : <Siren size={20} />}
            {running ? t("Sending…") : t("Simulate pressing SOS")}
          </button>

          <div className="ll-sos-demo-steps">
            {SOS_DEMO_STEPS.map((step, i) => {
              const state = activeStep > i || (activeStep === i && !running) ? "done" : activeStep === i ? "active" : "idle";
              return (
                <div key={step.label} className={`ll-sos-demo-step ll-sos-demo-step-${state}`}>
                  <span className="ll-sos-demo-step-dot">
                    {state === "done" ? <Check size={12} /> : i + 1}
                  </span>
                  <div>
                    <div className="ll-sos-demo-step-label">{t(step.label)}</div>
                    <div className="ll-sos-demo-step-detail">{t(step.detail)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="ll-sos-demo-note">{t("This is a simulation — no real alert is sent.")}</p>
        </motion.div>
      </div>
    </section>
  );
}

export default SosDemo;
