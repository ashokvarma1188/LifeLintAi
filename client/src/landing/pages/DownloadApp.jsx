import { Link } from "react-router-dom";
import { Smartphone } from "lucide-react";
import PublicLayout from "../PublicLayout";

function DownloadApp() {
  return (
    <PublicLayout>
      <div className="pp-container">
        <p className="pp-eyebrow">Mobile app</p>
        <h1 className="pp-title">LifeLink AI, in your pocket</h1>
        <p className="pp-subtitle">
          A dedicated mobile app is in development, built for faster SOS access, offline fallback, and
          push notifications on your alert's status.
        </p>

        <div className="pp-audience-card" style={{ maxWidth: 480, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <Smartphone size={28} style={{ color: "var(--ll-primary)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ marginBottom: 6 }}>Coming soon</h3>
            <p style={{ margin: 0, color: "var(--ll-muted-foreground)", fontSize: 13.5, lineHeight: 1.7 }}>
              We're not ready to publish app store links just yet. In the meantime, every feature — SOS,
              health records, hospital/police/fire/pharmacy dashboards, and the AI First-Aid Assistant — is
              fully available on the web, and works well on mobile browsers too.
            </p>
          </div>
        </div>

        <Link to="/signup" className="ll-btn ll-btn-primary ll-btn-wide" style={{ marginTop: 24 }}>
          Use LifeLink AI on the web
        </Link>
      </div>
    </PublicLayout>
  );
}

export default DownloadApp;
