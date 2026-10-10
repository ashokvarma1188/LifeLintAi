import { useEffect, useRef, useState } from "react";
import { Siren } from "lucide-react";
import { useLang } from "../i18n/context";
import "./VoiceSos.css";

const COUNTDOWN_SECONDS = 5;

/**
 * Full-screen "Sending SOS in 5…4…3" confirmation shared by Voice SOS and Shake SOS.
 * Mount it to start; `onFire` runs at zero (or on "Send now"), `onCancel` on Cancel.
 */
function SosCountdown({ note, onFire, onCancel }) {
  const { t } = useLang();
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const onFireRef = useRef(onFire);
  useEffect(() => {
    onFireRef.current = onFire;
  });

  useEffect(() => {
    navigator.vibrate?.(80);
    const timer = setTimeout(() => {
      if (count <= 1) onFireRef.current();
      else setCount(count - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="voice-sos-backdrop" role="alertdialog" aria-live="assertive" aria-label={t("Sending SOS")}>
      <div className="voice-sos-modal">
        <Siren size={28} />
        <h3>{t("Sending SOS in")}</h3>
        <div className="voice-sos-count" key={count}>
          {count}
        </div>
        {note && <p className="voice-sos-heard">{note}</p>}
        <p>{t("Your live location will be shared with the selected services.")}</p>
        <div className="voice-sos-actions">
          <button type="button" className="voice-sos-cancel" onClick={onCancel}>
            {t("Cancel")}
          </button>
          <button type="button" className="voice-sos-now" onClick={() => onFireRef.current()}>
            {t("Send now")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SosCountdown;
