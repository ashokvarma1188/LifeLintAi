import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, RefreshCw, Copy, Check, ShieldOff } from "lucide-react";
import { enableMedicalIdLink, disableMedicalIdLink } from "../services/medicalId";
import { getErrorMessage } from "../services/api";
import { useLang } from "../i18n/context";
import "./MedicalIdQr.css";

/**
 * Opt-in QR code for the Medical ID. Scanning it opens a public page with blood group,
 * allergies, conditions and emergency contacts — no login — so a responder can use it from
 * a printed card or a lock-screen photo. The owner can turn it off or rotate it at any time.
 */
function MedicalIdQr({ initialToken }) {
  const { t } = useLang();
  const [token, setToken] = useState(initialToken || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const url = token ? `${window.location.origin}/id/${token}` : "";

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err, t("Something went wrong. Please try again.")));
    } finally {
      setBusy(false);
    }
  };

  const turnOn = () => run(async () => setToken(await enableMedicalIdLink()));
  const turnOff = () =>
    run(async () => {
      await disableMedicalIdLink();
      setToken(null);
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard can be blocked; the QR code itself still works */
    }
  };

  return (
    <div className="mid-qr">
      <div className="mid-qr-head">
        <QrCode size={16} />
        <strong>{t("QR code for emergencies")}</strong>
      </div>

      {error && <div className="portal-message error">{error}</div>}

      {!token ? (
        <>
          <p>
            {t("Turn this on to get a QR code anyone can scan to see your blood group, allergies, conditions and emergency contacts — without logging in. Save it as your lock-screen picture or print it for your wallet.")}
          </p>
          <button className="portal-btn primary small" onClick={turnOn} disabled={busy}>
            <QrCode size={14} /> {busy ? t("Creating…") : t("Create my QR code")}
          </button>
        </>
      ) : (
        <div className="mid-qr-body">
          <div className="mid-qr-code">
            <QRCodeSVG value={url} size={150} level="M" marginSize={2} />
          </div>
          <div className="mid-qr-info">
            <p>
              {t("Anyone with this code can see your emergency details. Switch it off any time, or make a new code if you lose the old one.")}
            </p>
            <div className="mid-qr-actions">
              <button className="portal-btn ghost small" onClick={copy}>
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t("Copied") : t("Copy link")}
              </button>
              <button className="portal-btn ghost small" onClick={turnOn} disabled={busy}>
                <RefreshCw size={13} /> {t("New code")}
              </button>
              <button className="portal-btn danger small" onClick={turnOff} disabled={busy}>
                <ShieldOff size={13} /> {t("Turn off")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicalIdQr;
