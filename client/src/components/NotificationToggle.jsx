import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Send } from "lucide-react";
import { pushSupported, getPushConfig, currentSubscription, enablePush, disablePush, sendTestPush } from "../services/push";
import { getErrorMessage } from "../services/api";
import "./NotificationToggle.css";

const COPY = {
  civilian: {
    title: "Updates on your SOS",
    text: "Get a notification the moment a hospital, police or fire team accepts your SOS — even when LifeLink is closed.",
  },
  responder: {
    title: "SOS alerts on this device",
    text: "Get a loud notification for every new SOS in your area, even when LifeLink is closed.",
  },
};

/** Dashboard card to turn push notifications on/off for this browser, with a test button. */
function NotificationToggle({ role }) {
  const [state, setState] = useState("loading"); // loading | hidden | off | on | denied
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!pushSupported()) return setState("hidden");
      try {
        const { enabled } = await getPushConfig();
        if (!enabled) return setState("hidden");
        if (Notification.permission === "denied") return setState("denied");
        const subscription = await currentSubscription();
        setState(subscription && Notification.permission === "granted" ? "on" : "off");
      } catch {
        setState("hidden");
      }
    })();
  }, []);

  if (state === "loading" || state === "hidden") return null;
  const copy = role === "civilian" ? COPY.civilian : COPY.responder;

  const run = async (action, after) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      after?.();
    } catch (err) {
      const text = err.response ? getErrorMessage(err) : err.message;
      setError(text || "Something went wrong.");
      if (Notification.permission === "denied") setState("denied");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`notif-card ${state}`}>
      <div className="notif-icon">{state === "on" ? <BellRing size={18} /> : state === "denied" ? <BellOff size={18} /> : <Bell size={18} />}</div>
      <div className="notif-body">
        <strong>{copy.title}</strong>
        <span>
          {state === "on"
            ? "Notifications are on for this device."
            : state === "denied"
              ? "Notifications are blocked for this site. Allow them from the lock icon in your browser's address bar, then reload."
              : copy.text}
        </span>
        {message && <span className="notif-ok">{message}</span>}
        {error && <span className="notif-error">{error}</span>}
      </div>
      <div className="notif-actions">
        {state === "off" && (
          <button className="portal-btn primary small" disabled={busy} onClick={() => run(enablePush, () => setState("on"))}>
            <Bell size={14} /> {busy ? "Turning on…" : "Turn on"}
          </button>
        )}
        {state === "on" && (
          <>
            <button
              className="portal-btn ghost small"
              disabled={busy}
              onClick={() => run(sendTestPush, () => setMessage("Test sent — it should appear in a few seconds."))}
            >
              <Send size={13} /> Send test
            </button>
            <button className="portal-btn ghost small" disabled={busy} onClick={() => run(disablePush, () => setState("off"))}>
              <BellOff size={13} /> Turn off
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default NotificationToggle;
