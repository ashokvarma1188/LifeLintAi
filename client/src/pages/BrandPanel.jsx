import { IconPulse, IconSiren, IconHospital, IconDroplet, IconBot } from "./icons";

const FEATURES = [
  { icon: IconSiren, title: "Instant SOS alerts", desc: "One tap notifies the nearest hospital with your live location." },
  { icon: IconHospital, title: "Nearby hospital finder", desc: "Real-time bed and ambulance availability." },
  { icon: IconDroplet, title: "Blood donor network", desc: "Match with donors by blood group, nearby." },
  { icon: IconBot, title: "AI first-aid assistant", desc: "Guidance while help is on the way." },
];

function BrandPanel({ tagline }) {
  return (
    <div className="auth-brand">
      <div className="auth-topbar">
        <div className="mark">
          <IconPulse width={20} height={20} />
        </div>
        <div className="brand-name">LifeLink AI</div>
      </div>

      <div className="auth-brand-content">
        <h1>Help arrives faster, when every second counts.</h1>
        <p>{tagline}</p>

        <div className="feature-column">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div className="feature-row" key={title}>
              <div className="feature-icon">
                <Icon width={18} height={18} />
              </div>
              <div>
                <div className="feature-title">{title}</div>
                <div className="feature-desc">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-stats">
        <div>
          <span className="num">24/7</span>
          <span className="label">Emergency response</span>
        </div>
        <div>
          <span className="num">10 km</span>
          <span className="label">Hospital search radius</span>
        </div>
        <div>
          <span className="num">AI</span>
          <span className="label">Powered triage</span>
        </div>
      </div>
    </div>
  );
}

export default BrandPanel;
