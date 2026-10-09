import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeartHandshake, Award, CalendarClock, Droplet } from "lucide-react";
import { getDonationStatus, recordDonation } from "../services/donors";
import { getErrorMessage } from "../services/api";
import "./DonationCard.css";

const badgeFor = (count) => {
  if (count >= 10) return "Gold donor";
  if (count >= 5) return "Silver donor";
  if (count >= 1) return "Bronze donor";
  return null;
};

/** The donor's own record: donations given, lives helped, when they can give again, and a one-tap "I just donated". */
export function DonationCard({ onChange }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setStatus(await getDonationStatus().catch(() => null));
    })();
  }, []);

  const donated = async () => {
    setBusy(true);
    setError("");
    try {
      const next = await recordDonation();
      setStatus(next);
      onChange?.();
    } catch (err) {
      setError(getErrorMessage(err, "Could not record your donation."));
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
            <span>donation{status.donationCount === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="donation-stat">
          <Droplet size={18} />
          <div>
            <strong>{status.livesSaved}</strong>
            <span>lives you may have saved</span>
          </div>
        </div>
        {badge && (
          <div className="donation-stat badge">
            <Award size={18} />
            <div>
              <strong>{badge}</strong>
              <span>thank you!</span>
            </div>
          </div>
        )}
      </div>

      <div className="donation-next">
        <CalendarClock size={15} />
        {status.eligible ? (
          <span>You&apos;re eligible to donate now. Whole-blood donors can give every 90 days.</span>
        ) : (
          <span>
            Resting after your last donation — you can donate again on{" "}
            <strong>{new Date(status.nextEligibleAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>{" "}
            ({status.daysUntilEligible} day{status.daysUntilEligible === 1 ? "" : "s"}).
          </span>
        )}
        {status.eligible && (
          <button className="portal-btn ghost small" onClick={donated} disabled={busy}>
            {busy ? "Saving…" : "I just donated"}
          </button>
        )}
      </div>
      {error && <div className="portal-message error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}

/** Dashboard nudge: shown only once someone has donated before and their 90-day rest is over. */
export function DonateAgainBanner() {
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
        <strong>You can donate blood again!</strong> It&apos;s been over 90 days since your last donation — someone nearby may need you.
      </span>
      <Link to="/blood-donation" className="portal-btn primary small">View requests</Link>
    </div>
  );
}
