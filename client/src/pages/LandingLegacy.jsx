import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconPulse,
  IconSiren,
  IconHospital,
  IconDroplet,
  IconBot,
  IconUser,
  IconMapPin,
  IconCheck,
  IconShield,
  IconBell,
  IconTarget,
  IconHeartHand,
} from "./icons";
import "./LandingLegacy.css";

const STEPS = [
  {
    icon: IconUser,
    num: "STEP 01",
    title: "Register & set up",
    desc: "Create your account and add your blood group, medical history, allergies, and emergency contacts.",
  },
  {
    icon: IconTarget,
    num: "STEP 02",
    title: "Press SOS",
    desc: "One tap captures your live GPS location and finds the nearest hospital within seconds.",
  },
  {
    icon: IconHeartHand,
    num: "STEP 03",
    title: "Help arrives",
    desc: "The hospital is alerted with your medical profile, and your emergency contacts get your live location.",
  },
];

const FEATURES = [
  { icon: IconSiren, title: "Instant SOS", desc: "One tap alerts the nearest hospital with your live location and medical profile." },
  { icon: IconHospital, title: "Hospital finder", desc: "Search nearby hospitals with real-time bed and ambulance availability." },
  { icon: IconDroplet, title: "Blood donor network", desc: "Find and request matching blood donors near you, by group and distance." },
  { icon: IconBot, title: "AI first-aid assistant", desc: "Get immediate first-aid guidance while professional help is on the way." },
  { icon: IconShield, title: "Medical profile", desc: "Blood group, allergies, and conditions ready for responders the moment they arrive." },
  { icon: IconBell, title: "Contact alerts", desc: "Your trusted contacts are notified automatically with a live location link." },
];

function Landing() {
  const navigate = useNavigate();
  const stepsRef = useRef(null);
  const impactRef = useRef(null);
  const featuresRef = useRef(null);
  const emergencyRef = useRef(null);

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="land">
      <div className="land-bg-glow" />

      <div className="land-nav-wrap">
        <nav className="land-nav">
          <div className="land-logo">
            <IconPulse width={18} height={18} className="drop" style={{ color: "#1fe08a" }} />
            Life<span className="drop">Link AI</span>
          </div>

          <div className="land-nav-links">
            <button onClick={() => scrollTo(stepsRef)}>How it works</button>
            <button onClick={() => scrollTo(impactRef)}>Impact</button>
            <button onClick={() => scrollTo(featuresRef)}>Features</button>
            <button onClick={() => scrollTo(emergencyRef)}>Emergency</button>
          </div>

          <div className="land-nav-actions">
            <button className="land-link-btn" onClick={() => navigate("/login")}>
              Sign in
            </button>
            <button className="land-cta-btn" onClick={() => navigate("/signup")}>
              Get started
            </button>
          </div>
        </nav>
      </div>

      <header className="land-hero">
        <div className="land-badge">
          <span className="dot" /> Live emergency network · 24/7 response
        </div>
        <h1>
          Every second counts.
          <span className="accent-line">We make them count.</span>
        </h1>
        <p>
          LifeLink AI connects you to the nearest hospital, blood donors, and your emergency
          contacts — instantly, from a single tap.
        </p>
        <div className="land-hero-actions">
          <button className="land-btn-primary" onClick={() => navigate("/signup")}>
            <IconHeartHand width={18} height={18} /> Get started
          </button>
          <button className="land-btn-danger" onClick={() => navigate("/login")}>
            <IconSiren width={18} height={18} /> Emergency SOS
          </button>
        </div>
      </header>

      <div className="land-hero-visual">
        <div className="pulse-orb">
          <div className="inner">
            <IconHeartHand width={22} height={22} />
          </div>
        </div>
        <div className="pulse-line-wrap">
          <svg viewBox="0 0 400 40" preserveAspectRatio="none">
            <path d="M0,20 L120,20 L140,6 L160,34 L180,20 L400,20" />
          </svg>
        </div>
      </div>

      <section className="land-section" ref={stepsRef}>
        <div className="land-eyebrow">How it works</div>
        <h2>Three steps. Zero delay.</h2>
        <div className="land-steps">
          {STEPS.map(({ icon: Icon, num, title, desc }) => (
            <div className="land-step-card" key={title}>
              <div className="land-step-icon">
                <Icon width={20} height={20} />
              </div>
              <div className="land-step-num">{num}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section" ref={impactRef}>
        <div className="land-stats-box">
          <div>
            <span className="stat-num">24/7</span>
            <div className="stat-label">Emergency response</div>
          </div>
          <div>
            <span className="stat-num">10 km</span>
            <div className="stat-label">Hospital search radius</div>
          </div>
          <div>
            <span className="stat-num">&lt;2s</span>
            <div className="stat-label">Nearest hospital match</div>
          </div>
          <div>
            <span className="stat-num">AI</span>
            <div className="stat-label">Powered triage</div>
          </div>
        </div>
      </section>

      <section className="land-section" ref={featuresRef}>
        <div className="land-eyebrow">Platform features</div>
        <h2>Built for the worst moments.</h2>
        <div className="land-features">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div className="land-feature-card" key={title}>
              <div className="land-feature-icon">
                <Icon width={19} height={19} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section" ref={emergencyRef}>
        <div className="land-emergency">
          <div>
            <div className="land-eyebrow" style={{ color: "#ef4444" }}>
              Emergency mode
            </div>
            <h2>
              When seconds
              <br />
              <span className="danger-text">matter most.</span>
            </h2>
            <p>
              Press SOS and the platform captures your location, runs a geospatial search for the
              nearest hospital, attaches your medical profile, and alerts your emergency contacts —
              all in one action.
            </p>
            <div className="land-check-list">
              <div>
                <span className="tick">
                  <IconCheck width={11} height={11} />
                </span>
                Nearest hospital found automatically
              </div>
              <div>
                <span className="tick">
                  <IconCheck width={11} height={11} />
                </span>
                Live GPS location shared with responders
              </div>
              <div>
                <span className="tick">
                  <IconCheck width={11} height={11} />
                </span>
                Medical profile delivered before arrival
              </div>
              <div>
                <span className="tick">
                  <IconCheck width={11} height={11} />
                </span>
                Emergency contacts notified instantly
              </div>
            </div>
          </div>

          <div className="land-mock-card">
            <div className="land-mock-head">
              <div className="icon">
                <IconSiren width={19} height={19} />
              </div>
              <div>
                <strong>SOS request</strong>
                <span>Amaravati General · 0.3 km away</span>
              </div>
              <span className="land-mock-badge">CRITICAL</span>
            </div>

            <div className="land-mock-row">
              <div className="land-mock-person">
                <div className="land-mock-avatar">
                  <IconHospital width={14} height={14} />
                </div>
                <div>
                  <div>Amaravati General</div>
                  <div className="land-mock-sub">
                    <IconMapPin width={10} height={10} /> 0.3 km · 15 beds free
                  </div>
                </div>
              </div>
              <span className="land-mock-status">Notified</span>
            </div>

            <div className="land-mock-row">
              <div className="land-mock-person">
                <div className="land-mock-avatar">A</div>
                <div>
                  <div>Ashok (Father)</div>
                  <div className="land-mock-sub">Emergency contact · SMS sent</div>
                </div>
              </div>
              <span className="land-mock-status">Alerted</span>
            </div>

            <div className="land-mock-row">
              <div className="land-mock-person">
                <div className="land-mock-avatar">
                  <IconDroplet width={13} height={13} />
                </div>
                <div>
                  <div>Blood group O+</div>
                  <div className="land-mock-sub">Allergies: Penicillin</div>
                </div>
              </div>
              <span className="land-mock-status">Shared</span>
            </div>
          </div>
        </div>
      </section>

      <section className="land-section">
        <div className="land-cta-box">
          <div className="icon-big">
            <IconHeartHand width={26} height={26} />
          </div>
          <h2>
            Set it up today.
            <span className="accent-line">Be ready for tomorrow.</span>
          </h2>
          <p>
            Free to use. Takes two minutes to set up. The moment you need it, everything is
            already in place.
          </p>
          <div className="land-cta-actions">
            <button className="land-btn-primary" onClick={() => navigate("/signup")}>
              Create free account
            </button>
            <button className="land-btn-outline" onClick={() => navigate("/login")}>
              Sign in
            </button>
          </div>
        </div>
      </section>

      <footer className="land-footer">
        <div className="land-logo">
          <IconPulse width={14} height={14} style={{ color: "#1fe08a" }} />
          LifeLink AI · Emergency Response Platform
        </div>
        <div>© 2026 LifeLink AI · Capstone Project</div>
      </footer>
    </div>
  );
}

export default Landing;
