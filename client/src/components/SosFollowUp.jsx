import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Smartphone, Copy, Check, BedDouble, Phone, UserPlus } from "lucide-react";
import MapsLink from "./MapsLink";
import { sosMessage, trackUrl, whatsappLink, smsLink } from "../utils/share";
import { useLang } from "../i18n/context";
import "./SosFollowUp.css";

/**
 * Shown right after an SOS is sent: one tap to tell family (WhatsApp / SMS with a live
 * tracking link), and the nearest hospitals with how many beds are free right now.
 */
function SosFollowUp({ result, contacts, userName, type }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const token = result.emergencyRequest?.shareToken;
  const hospitals = result.nearbyHospitals || [];
  const reachable = (contacts || []).filter((c) => c.phone);
  const message = token ? sosMessage(userName, type, token, t) : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackUrl(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard can be blocked — the WhatsApp/SMS buttons still work */
    }
  };

  return (
    <div className="sos-followup">
      {token && (
        <div className="sos-followup-block">
          <h4>{t("Tell your family")}</h4>
          {reachable.length === 0 ? (
            <p>
              {t("You haven't saved any emergency contacts.")}{" "}
              <Link to="/profile"><UserPlus size={12} /> {t("Add family numbers")}</Link> {t("to alert them in one tap next time.")}
            </p>
          ) : (
            <div className="sos-contact-list">
              {reachable.map((c, i) => (
                <div key={i} className="sos-contact">
                  <span>{c.name || c.phone}{c.relation ? ` (${c.relation})` : ""}</span>
                  <a href={whatsappLink(c.phone, message)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                  <a href={smsLink(c.phone, message)}>
                    <Smartphone size={13} /> SMS
                  </a>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="sos-copy" onClick={copyLink}>
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t("Link copied") : t("Copy live-tracking link")}
          </button>
        </div>
      )}

      {hospitals.length > 0 && (
        <div className="sos-followup-block">
          <h4>{t("Nearest hospitals — beds free now")}</h4>
          {hospitals.map((h) => (
            <div key={h._id} className="sos-hospital">
              <div>
                <strong>{h.name}</strong>
                <span className={`sos-beds ${h.availableBeds > 0 ? "ok" : "none"}`}>
                  <BedDouble size={12} /> {t("{count} free", { count: h.availableBeds ?? "—" })}
                  {h.icuAvailableBeds > 0 ? ` · ${t("{count} ICU", { count: h.icuAvailableBeds })}` : ""}
                </span>
              </div>
              <div className="sos-hospital-actions">
                {h.phone && (
                  <a href={`tel:${h.phone}`}><Phone size={12} /> {t("Call")}</a>
                )}
                <MapsLink coordinates={h.location?.coordinates} className="sos-map-link" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SosFollowUp;
