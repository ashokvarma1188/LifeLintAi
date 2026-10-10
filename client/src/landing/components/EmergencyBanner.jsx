import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useLang } from "../../i18n/context";

const DISMISS_KEY = "ll-emergency-banner-dismissed";

/** LifeLink coordinates responders — it is never itself the emergency line. Shown on every public page. */
function EmergencyBanner() {
  const { t } = useLang();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "1");

  const ref = useRef(null);

  // The navbar is fixed to the top; push it down by however much of this banner is still on
  // screen so the banner never covers the menu, and let it slide back up as the banner scrolls away.
  useEffect(() => {
    const root = document.documentElement;
    if (dismissed || !ref.current) {
      root.style.setProperty("--ll-banner-offset", "0px");
      return undefined;
    }
    const update = () => {
      const visible = Math.max(0, (ref.current?.offsetHeight || 0) - window.scrollY);
      root.style.setProperty("--ll-banner-offset", `${visible}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      root.style.setProperty("--ll-banner-offset", "0px");
    };
  }, [dismissed]);

  if (dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="pp-emergency-banner" ref={ref}>
      <AlertTriangle size={15} />
      <span>
        {t("In a life-threatening emergency, call your local emergency number immediately. LifeLink helps coordinate a response — it does not replace emergency services.")}
      </span>
      <button type="button" onClick={dismiss} aria-label={t("Dismiss")}>
        <X size={15} />
      </button>
    </div>
  );
}

export default EmergencyBanner;
