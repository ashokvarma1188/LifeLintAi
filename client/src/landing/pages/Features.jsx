import { User, Hospital, ShieldCheck, Flame, Pill } from "lucide-react";
import PublicLayout from "../PublicLayout";

const AUDIENCES = [
  {
    icon: User,
    title: "Civilians",
    items: [
      "One-tap SOS with live location",
      "Health records with PDF reports",
      "Blood donation — offer or find donors",
      "Find nearby hospitals with live bed/ambulance status",
      "Find pharmacies and request medicine",
      "AI First-Aid Assistant",
    ],
  },
  {
    icon: Hospital,
    title: "Hospitals",
    items: [
      "Live SOS alerts routed to your hospital",
      "Accept and resolve incoming patients",
      "Patient lookup by phone, file medical reports",
      "Keep bed & ambulance availability live",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Police",
    items: [
      "Live feed of active SOS alerts",
      "Interactive coverage map of incidents",
      "File and track incident reports",
    ],
  },
  {
    icon: Flame,
    title: "Fire Stations",
    items: [
      "Live feed of active calls",
      "Interactive coverage map",
      "Fleet status — track engines and crews",
      "Incident reports",
    ],
  },
  {
    icon: Pill,
    title: "Pharmacies",
    items: [
      "Publish stock, hours, and open/closed status",
      "Receive medicine requests directly from civilians",
    ],
  },
];

function Features() {
  return (
    <PublicLayout>
      <div className="pp-container" style={{ maxWidth: "64rem" }}>
        <p className="pp-eyebrow">Features</p>
        <h1 className="pp-title">Built for everyone in the response chain</h1>
        <p className="pp-subtitle">
          One platform, one shared identity — a different dashboard for every role.
        </p>

        <div className="pp-card-grid">
          {AUDIENCES.map(({ icon: Icon, title, items }) => (
            <div className="pp-audience-card" key={title}>
              <h3><Icon size={17} /> {title}</h3>
              <ul>
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

export default Features;
