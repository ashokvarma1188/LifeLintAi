import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Siren, ArrowRight } from "lucide-react";
import HeroDrops from "./HeroDrops";
import EkgLine from "./EkgLine";
import { heroEnter, revealScale } from "../motion";

// The 3D stage pulls in three.js, so it is split out and only fetched once the
// rest of the hero has rendered.
const DonationBox3D = lazy(() => import("./DonationBox3D"));

function Hero() {
  return (
    <section id="top" className="ll-hero" style={{ background: "var(--ll-gradient-hero)" }}>
      <div className="ll-grid-bg ll-hero-grid" aria-hidden="true" />
      <HeroDrops />

      <div className="ll-hero-content">
        <motion.div {...heroEnter(0, { y: 12, duration: 0.6 })} className="ll-hero-badge">
          <span className="ll-ping">
            <span className="ll-ping-wave" />
            <span className="ll-ping-dot" />
          </span>
          Real-time donor matching · 24/7 emergency network
        </motion.div>

        <motion.h1 {...heroEnter(0.1)} className="ll-hero-title">
          Every drop.
          <br />
          <span className="ll-text-gradient-success">Saves a life.</span>
        </motion.h1>

        <motion.p {...heroEnter(0.2)} className="ll-hero-sub">
          LifeLink is the smart blood &amp; organ donation network connecting hospitals with verified
          donors in seconds — privacy-first, geo-matched, life-saving.
        </motion.p>

        <motion.div {...heroEnter(0.3)} className="ll-hero-actions">
          <Link to="/signup" className="ll-btn ll-btn-primary">
            <Heart size={16} fill="currentColor" />
            Become a Donor
            <ArrowRight size={16} className="ll-btn-arrow" />
          </Link>
          <Link to="/signup" className="ll-btn ll-btn-emergency">
            <Siren size={16} className="ll-heartbeat" />
            Emergency Request
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="ll-hero-vitals"
        >
          <div className="ll-pulse-orb">
            <span className="ll-pulse-ring" />
            <span className="ll-pulse-ring" style={{ animationDelay: "1s" }} />
            <div className="ll-pulse-core">
              <Heart size={24} fill="currentColor" className="ll-heartbeat" />
            </div>
          </div>
          <div className="ll-ekg-wrap">
            <EkgLine className="ll-ekg" />
          </div>
        </motion.div>

        <motion.div {...revealScale()} className="ll-hero-stage">
          <Suspense fallback={<div className="ll-stage-fallback">Loading 3D scene…</div>}>
            <DonationBox3D />
          </Suspense>
          <p className="ll-stage-caption">
            Move your cursor — every drop reaches the box, every box reaches a hospital.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
