import { useState } from "react";
import Particles from "./components/Particles";
import ThemeToggle from "./components/ThemeToggle";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import ImpactStats from "./components/ImpactStats";
import DonorBenefits from "./components/DonorBenefits";
import EmergencyMode from "./components/EmergencyMode";
import CtaFooter from "./components/CtaFooter";
import "./theme.css";
import "./landing.css";

function Landing() {
  // The landing ships dark like the reference; this only swaps its own palette.
  const [light, setLight] = useState(false);

  return (
    <div className={`ll-root${light ? " ll-light" : ""}`}>
      <Particles />
      <ThemeToggle light={light} onToggle={() => setLight((v) => !v)} />
      <main className="ll-main">
        <Navbar />
        <Hero />
        <HowItWorks />
        <ImpactStats />
        <DonorBenefits />
        <EmergencyMode />
        <CtaFooter />
      </main>
    </div>
  );
}

export default Landing;
