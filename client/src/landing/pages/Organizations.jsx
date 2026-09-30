import { Link } from "react-router-dom";
import { Hospital, ShieldCheck, Flame, Pill, CheckCircle2 } from "lucide-react";
import PublicLayout from "../PublicLayout";

const ORG_TYPES = [
  { icon: Hospital, title: "Hospitals", desc: "Receive SOS alerts, manage incoming patients, keep bed and ambulance availability live for civilians searching nearby." },
  { icon: ShieldCheck, title: "Police", desc: "See live SOS alerts across your coverage area on a real map, and file incident reports as you respond." },
  { icon: Flame, title: "Fire Stations", desc: "Track active calls, manage your fleet's status, and see incidents plotted on a coverage map." },
  { icon: Pill, title: "Pharmacies", desc: "Publish your stock and hours, and receive medicine requests directly from nearby civilians." },
];

const STEPS = [
  "Sign up and choose your organisation type",
  "Your account is created in a pending state",
  "A LifeLink admin reviews your details and approves your account",
  "You get full access to your organisation's dashboard",
];

function Organizations() {
  return (
    <PublicLayout>
      <div className="pp-container">
        <p className="pp-eyebrow">For organizations</p>
        <h1 className="pp-title">Join the response network</h1>
        <p className="pp-subtitle">
          LifeLink AI connects civilians directly to hospitals, police, fire stations, and pharmacies. If
          your organisation responds to emergencies or serves the public, here's what you get.
        </p>

        <div className="pp-card-grid">
          {ORG_TYPES.map(({ icon: Icon, title, desc }) => (
            <div className="pp-audience-card" key={title}>
              <h3><Icon size={17} /> {title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        <div className="pp-prose">
          <h2>How verification works</h2>
          <ul>
            {STEPS.map((step) => (
              <li key={step}><CheckCircle2 size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -1 }} />{step}</li>
            ))}
          </ul>
          <p>This keeps the network trustworthy — civilians only ever see and alert organisations that have been reviewed.</p>
        </div>

        <Link to="/signup" className="ll-btn ll-btn-primary ll-btn-wide" style={{ marginTop: 8 }}>
          Register your organisation
        </Link>
      </div>
    </PublicLayout>
  );
}

export default Organizations;
