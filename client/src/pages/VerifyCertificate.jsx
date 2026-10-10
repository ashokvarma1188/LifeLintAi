import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BadgeCheck, ShieldX, GraduationCap, Droplet } from "lucide-react";
import { verifyCertificate } from "../services/certificates";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { formatDate } from "../utils/pdf";
import { useLang } from "../i18n/context";
import "./Dashboard.css";
import "./portal.css";
import "./FirstAidCourse.css";

/** Public page behind a certificate's QR code: shows whether the certificate is genuine. */
function VerifyCertificate() {
  const { code } = useParams();
  const { t, lang } = useLang();
  const [certificate, setCertificate] = useState(null);
  const [state, setState] = useState("loading"); // loading | valid | invalid

  useEffect(() => {
    let cancelled = false;
    verifyCertificate(code)
      .then((found) => {
        if (cancelled) return;
        setCertificate(found);
        setState("valid");
      })
      .catch(() => !cancelled && setState("invalid"));
    return () => {
      cancelled = true;
    };
  }, [code]);

  const isDonation = certificate?.kind === "blood_donation";
  const Icon = isDonation ? Droplet : GraduationCap;

  return (
    <div className="portal-page">
      <div className="portal-content" style={{ maxWidth: 620 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <Link to="/" style={{ fontWeight: 800, color: "var(--text-primary)", textDecoration: "none" }}>🩸 LifeLink AI</Link>
          <LanguageSwitcher />
        </div>

        {state === "loading" && <div className="portal-panel">{t("Checking certificate…")}</div>}

        {state === "invalid" && (
          <div className="portal-panel verify-card invalid">
            <ShieldX size={46} />
            <h1>{t("Certificate not found")}</h1>
            <p>{t("No LifeLink certificate has the code {code}. Check the code and try again.", { code })}</p>
          </div>
        )}

        {state === "valid" && certificate && (
          <div className={`portal-panel verify-card valid ${isDonation ? "donation" : ""}`}>
            <span className="verify-badge"><BadgeCheck size={18} /> {t("Genuine certificate")}</span>
            <div className="verify-icon"><Icon size={34} /></div>
            <p className="verify-label">{t(isDonation ? "Certificate of Appreciation" : "Certificate of Completion")}</p>
            <h1>{certificate.recipientName}</h1>
            <p className="verify-what">
              {isDonation
                ? t("has selflessly donated blood and helped save up to 3 lives.")
                : t("has completed the LifeLink first-aid course and is First-Aid Aware.")}
            </p>
            {isDonation && certificate.meta?.place && <p className="verify-detail">{certificate.meta.place}</p>}
            {!isDonation && certificate.meta?.score != null && (
              <p className="verify-detail">{t("Quiz score: {score} out of {total}", { score: certificate.meta.score, total: certificate.meta.total })}</p>
            )}
            <div className="verify-meta">
              <div><span>{t("Issued on")}</span><strong>{formatDate(certificate.issuedAt, lang)}</strong></div>
              <div><span>{t("Certificate code")}</span><strong>{certificate.code}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyCertificate;
