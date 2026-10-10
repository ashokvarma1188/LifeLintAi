import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeartHandshake, Award, CalendarClock, Droplet, FileBadge } from "lucide-react";
import { getDonationStatus, recordDonation } from "../services/donors";
import { getDonationCertificate } from "../services/certificates";
import { getErrorMessage } from "../services/api";
import { useLang } from "../i18n/context";
import { speechLangFor } from "../i18n/languages";
import "./DonationCard.css";

const badgeFor = (count) => {
  if (count >= 10) return "Gold donor";
  if (count >= 5) return "Silver donor";
  if (count >= 1) return "Bronze donor";
  return null;
};

/** The donor's own record: donations given, lives helped, when they can give again, and a one-tap "I just donated". */
export function DonationCard({ onChange }) {
  const { t, lang } = useLang();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [certBusy, setCertBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setStatus(await getDonationStatus().catch(() => null));
    })();
  }, []);

  const downloadCertificate = async () => {
    setCertBusy(true);
    setError("");
    try {
      const certificate = await getDonationCertificate();
      const pdf = await import("../utils/pdf");
      await pdf.downloadCertificate(certificate, t, lang);
    } catch (err) {
      setError(getErrorMessage(err, t("Could not make your certificate.")));
    } finally {
      setCertBusy(false);
    }
  };

  const donated = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await recordDonation();
      setStatus(next);
      onChange?.();
    } catch (err) {
      setError(getErrorMessage(err, t("Could not record your donation.")));
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;
  const badge = badgeFor(status.donationCount);

  return (
    <div className="portal-panel donation-card" style={{ marginBottom: 20 }}>
      <div className="donation-stats">
        <div className="donation-stat">
          <HeartHandshake size={18} />
          <div>
            <strong>{status.donationCount}</strong>
            <span>{status.donationCount === 1 ? t("donation") : t("donations")}</span>
          </div>
        </div>
        <div className="donation-stat">
          <Droplet size={18} />
          <div>
            <strong>{status.livesSaved}</strong>
            <span>{t("lives you may have saved")}</span>
          </div>
        </div>
        {badge && (
          <div className="donation-stat badge">
            <Award size={18} />
            <div>
              <strong>{t(badge)}</strong>
              <span>{t("thank you!")}</span>
            </div>
          </div>
        )}
      </div>

      <div className="donation-next">
        <CalendarClock size={15} />
        {status.eligible ? (
          <span>{t("You're eligible to donate now. Whole-blood donors can give every 90 days.")}</span>
        ) : (
          <span>
            {t(status.daysUntilEligible === 1 ? "Resting after your last donation — you can donate again on {date} (1 day)." : "Resting after your last donation — you can donate again on {date} ({days} days).", {
              date: new Date(status.nextEligibleAt).toLocaleDateString(speechLangFor(lang), { day: "numeric", month: "short", year: "numeric" }),
              days: status.daysUntilEligible,
            })}
          </span>
        )}
        {status.eligible && (
          <button className="portal-btn ghost small" onClick={donated} disabled={busy}>
            {busy ? t("Saving…") : t("I just donated")}
          </button>
        )}
        {status.donationCount > 0 && (
          <button className="portal-btn primary small" onClick={downloadCertificate} disabled={certBusy}>
            <FileBadge size={14} /> {certBusy ? t("Preparing PDF…") : t("Download certificate")}
          </button>
        )}
      </div>
      {error && <div className="portal-message error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}

/** Dashboard nudge: shown only once someone has donated before and their 90-day rest is over. */
export function DonateAgainBanner() {
  const { t } = useLang();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    (async () => {
      setStatus(await getDonationStatus().catch(() => null));
    })();
  }, []);

  if (!status || !status.donationCount || !status.eligible) return null;

  return (
    <div className="donate-again-banner">
      <HeartHandshake size={18} />
      <span>
        <strong>{t("You can donate blood again!")}</strong> {t("It's been over 90 days since your last donation — someone nearby may need you.")}
      </span>
      <Link to="/blood-donation" className="portal-btn primary small">{t("View requests")}</Link>
    </div>
  );
}
