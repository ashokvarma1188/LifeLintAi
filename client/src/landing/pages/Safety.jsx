import { Lock, ShieldCheck, Eye, KeyRound } from "lucide-react";
import PublicLayout from "../PublicLayout";

const PROTECTIONS = [
  {
    icon: Lock,
    title: "Encrypted in transit",
    desc: "Every connection between your browser and our servers runs over HTTPS. Passwords are hashed with bcrypt and never stored in plain text.",
  },
  {
    icon: ShieldCheck,
    title: "Verified organisations only",
    desc: "Hospital, Police, Fire Station, and Pharmacy accounts stay in a pending state until a LifeLink admin reviews and approves them — civilians only ever see verified organisations.",
  },
  {
    icon: Eye,
    title: "Health records, scoped access",
    desc: "Your health records are visible to you and to hospital accounts that look you up by your registered phone number — built for real treatment situations, not open browsing.",
  },
  {
    icon: KeyRound,
    title: "Role-enforced on the server",
    desc: "Every role restriction (hospital-only, police-only, admin-only routes) is checked on our backend, not just hidden in the interface — so it can't be bypassed from the browser.",
  },
];

function Safety() {
  return (
    <PublicLayout>
      <div className="pp-container">
        <p className="pp-eyebrow">Safety &amp; privacy</p>
        <h1 className="pp-title">Built to protect sensitive information</h1>
        <p className="pp-subtitle">
          Health and location data are among the most sensitive things a person can share. Here's exactly
          how LifeLink AI treats them.
        </p>

        <div className="pp-card-grid">
          {PROTECTIONS.map(({ icon: Icon, title, desc }) => (
            <div className="pp-audience-card" key={title}>
              <h3><Icon size={17} /> {title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>

        <div className="pp-prose">
          <h2>Want the full legal detail?</h2>
          <p>
            This page explains our approach in plain language. For the complete, binding policy on data
            collection, use, and your rights, read our <a href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

export default Safety;
