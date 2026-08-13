import { motion } from "framer-motion";
import { BENEFITS } from "../data";
import { revealUp } from "../motion";

function DonorBenefits() {
  return (
    <section id="benefits" className="ll-section">
      <div className="ll-container ll-container-6xl">
        <div className="ll-section-head">
          <p className="ll-eyebrow">Donor benefits</p>
          <h2 className="ll-h2">Built to honor every donor.</h2>
        </div>

        <div className="ll-benefits">
          {BENEFITS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              /* Stagger resets per row so the third column never lags behind. */
              {...revealUp((i % 3) * 0.08, { y: 16, duration: 0.4, margin: "-60px" })}
              className="ll-card ll-benefit-card"
            >
              <span className="ll-card-orb ll-card-orb-sm" aria-hidden="true" />
              <div className="ll-benefit-icon">
                <Icon size={20} />
              </div>
              <h3 className="ll-benefit-title">{title}</h3>
              <p className="ll-benefit-desc">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DonorBenefits;
