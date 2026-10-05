import Particles from "./components/Particles";
import ThemeToggle from "./components/ThemeToggle";
import { useLightTheme } from "./useLightTheme";
import Navbar from "./components/Navbar";
import EmergencyBanner from "./components/EmergencyBanner";
import Hero from "./components/Hero";
import RoleShowcase from "./components/RoleShowcase";
import HowItWorks from "./components/HowItWorks";
import SosDemo from "./components/SosDemo";
import ImpactStats from "./components/ImpactStats";
import TrustBadges from "./components/TrustBadges";
import DonorBenefits from "./components/DonorBenefits";
import Testimonials from "./components/Testimonials";
import EmergencyMode from "./components/EmergencyMode";
import CtaFooter from "./components/CtaFooter";
import "./theme.css";
import "./landing.css";

function Landing() {
  // Shared with the auth pages (login/signup/etc.) so the choice carries over between them.
  const [light, setLight] = useLightTheme();

  return (
    <div className={`ll-root${light ? " ll-light" : ""}`}>
      <EmergencyBanner />
      <Particles />
      <ThemeToggle light={light} onToggle={() => setLight((v) => !v)} />
      <main className="ll-main">
        <Navbar />
        <Hero />
        <RoleShowcase />
        <HowItWorks />
        <SosDemo />
        <ImpactStats />
        <TrustBadges />
        <DonorBenefits />
        <Testimonials />
        <EmergencyMode />
        <CtaFooter />
      </main>
    </div>
  );
}

export default Landing;
