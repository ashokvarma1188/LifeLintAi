import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import BloodDrop from "./BloodDrop";
import { revealUp } from "../motion";

function CtaFooter() {
  return (
    <section className="ll-section">
      <div className="ll-container ll-container-5xl">
        <motion.div {...revealUp(0, { y: 20, duration: 0.6, margin: "-80px" })} className="ll-glass ll-cta">
          <div className="ll-grid-bg ll-cta-grid" aria-hidden="true" />

          <div className="ll-cta-content">
            <div className="ll-cta-mark">
              <BloodDrop size={44} />
            </div>
            <h2 className="ll-h2">
              Join the network. <br />
              <span className="ll-text-gradient-success">Be someone&apos;s reason.</span>
            </h2>
            <p className="ll-cta-sub">
              Free to join. Always anonymous until you say yes. Built for hospitals, powered by
              donors like you.
            </p>
            <div className="ll-cta-actions">
              <Link to="/signup" className="ll-btn ll-btn-primary ll-btn-wide">
                <Heart size={16} fill="currentColor" />
                Become a Donor
              </Link>
              <Link to="/signup" className="ll-btn ll-btn-ghost ll-btn-wide">
                Hospital sign-up
              </Link>
            </div>
          </div>
        </motion.div>

        <footer className="ll-footer">
          <div className="ll-footer-brand">
            <BloodDrop size={14} />
            <span>
              Life<span className="ll-footer-accent">Link</span> · Smart Donation Network
            </span>
          </div>
          <div>© {new Date().getFullYear()} LifeLink. Privacy-first by design.</div>
        </footer>
      </div>
    </section>
  );
}

export default CtaFooter;
