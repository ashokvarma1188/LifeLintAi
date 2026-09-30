import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "ll-emergency-banner-dismissed";

/** LifeLink coordinates responders — it is never itself the emergency line. Shown on every public page. */
function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "1");

  if (dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="pp-emergency-banner">
      <AlertTriangle size={15} />
      <span>
        In a life-threatening emergency, call your local emergency number immediately. LifeLink helps
        coordinate a response — it does not replace emergency services.
      </span>
      <button type="button" onClick={dismiss} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  );
}

export default EmergencyBanner;
