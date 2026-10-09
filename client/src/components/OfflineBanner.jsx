import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { WifiOff } from "lucide-react";
import "./OfflineBanner.css";

/** Shown whenever the device loses its connection — points people at the guide that still works. */
function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const { pathname } = useLocation();

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div className="offline-banner" role="status">
      <WifiOff size={15} />
      <span>You&apos;re offline. SOS and live data need a connection — call 112 in an emergency.</span>
      {pathname !== "/first-aid" && <Link to="/first-aid">Open First-Aid Guide</Link>}
    </div>
  );
}

export default OfflineBanner;
