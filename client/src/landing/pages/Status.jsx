import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import PublicLayout from "../PublicLayout";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function StatusRow({ name, sub, state }) {
  const label = state === "checking" ? "Checking…" : state === "up" ? "Operational" : "Unavailable";
  return (
    <div className="pp-status-row">
      <div>
        <div className="pp-status-name">{name}</div>
        <div className="pp-status-sub">{sub}</div>
      </div>
      <span className={`pp-status-badge ${state === "checking" ? "checking" : state === "up" ? "up" : "down"}`}>
        <span className="pp-status-dot" /> {label}
      </span>
    </div>
  );
}

function Status() {
  const [api, setApi] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    fetch(API_BASE, { method: "GET" })
      .then((res) => {
        if (!cancelled) setApi(res.ok ? "up" : "down");
      })
      .catch(() => {
        if (!cancelled) setApi("down");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicLayout>
      <div className="pp-container">
        <p className="pp-eyebrow">
          <Activity size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
          System status
        </p>
        <h1 className="pp-title">LifeLink AI status</h1>
        <p className="pp-subtitle">A live check of our core services, run when you load this page.</p>

        <StatusRow name="API & backend" sub={API_BASE} state={api} />
        <StatusRow name="Website" sub="You're looking at it — if this loaded, it's up." state="up" />

        <p style={{ fontSize: 12.5, color: "var(--ll-muted-foreground)", marginTop: 20 }}>
          This check runs directly from your browser against our live API — it's not a cached or
          simulated status.
        </p>
      </div>
    </PublicLayout>
  );
}

export default Status;
