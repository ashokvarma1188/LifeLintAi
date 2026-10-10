import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Siren, Droplet, Clock, MapPin, Check, X } from "lucide-react";
import { DONORS, EMERGENCY_POINTS } from "../data";
import { revealFromLeft, revealUp } from "../motion";
import { useLang } from "../../i18n/context";

/**
 * One donor in the request queue. The reference renders the accept/decline
 * controls as static affordances; here they are wired up so the pending →
 * accepted transition is actually demonstrable.
 */
function DonorRow({ donor, index, status, onRespond }) {
  const { t } = useLang();
  return (
    <motion.div {...revealFromLeft(0.2 + index * 0.1)} className="ll-donor-row" data-status={status}>
      <div className="ll-donor-identity">
        <div className="ll-donor-avatar">{donor.name[0]}</div>
        <div>
          <div className="ll-donor-name">{donor.name}</div>
          <div className="ll-donor-meta">
            <MapPin size={12} /> {donor.distance} · {t("ETA {eta}", { eta: donor.eta })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {status === "accepted" ? (
          <motion.span
            key="accepted"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="ll-donor-badge ll-donor-badge-accepted"
          >
            <Check size={12} /> {t("Accepted")}
          </motion.span>
        ) : status === "declined" ? (
          <motion.span
            key="declined"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="ll-donor-badge ll-donor-badge-declined"
          >
            <X size={12} /> {t("Declined")}
          </motion.span>
        ) : (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="ll-donor-controls"
          >
            <button
              type="button"
              className="ll-donor-btn ll-donor-btn-accept"
              onClick={() => onRespond("accepted")}
              aria-label={t("Accept {name}", { name: donor.name })}
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              className="ll-donor-btn ll-donor-btn-decline"
              onClick={() => onRespond("declined")}
              aria-label={t("Decline {name}", { name: donor.name })}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EmergencyMode() {
  const { t } = useLang();
  const [statuses, setStatuses] = useState(() => DONORS.map((d) => d.status));

  const respond = (index, next) =>
    setStatuses((prev) => prev.map((value, i) => (i === index ? next : value)));

  return (
    <section id="emergency" className="ll-section">
      <div className="ll-container ll-container-6xl">
        <div className="ll-emergency">
          <div>
            <p className="ll-eyebrow ll-eyebrow-emergency">{t("Emergency mode")}</p>
            <h2 className="ll-h2">
              {t("When seconds")} <span className="ll-text-gradient-emergency">{t("matter most.")}</span>
            </h2>
            <p className="ll-emergency-lead">
              {t("Hospitals raise a single request. Our matching engine ranks the closest available donors by blood group, distance, and donation gap — pushing live alerts in under two seconds.")}
            </p>
            <ul className="ll-emergency-list">
              {EMERGENCY_POINTS.map((point) => (
                <li key={point}>
                  <span className="ll-tick">
                    <Check size={12} />
                  </span>
                  <span>{t(point)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ll-emergency-panel-wrap">
            <div className="ll-emergency-halo" aria-hidden="true" />

            <motion.div
              {...revealUp(0, { y: 20, duration: 0.6, margin: "0px" })}
              className="ll-glass ll-emergency-card"
            >
              <span className="ll-emergency-rule" aria-hidden="true" />

              <div className="ll-emergency-head">
                <div className="ll-emergency-title">
                  <div className="ll-emergency-siren">
                    <Siren size={20} />
                  </div>
                  <div>
                    <div className="ll-emergency-name">{t("Emergency request")}</div>
                    <div className="ll-emergency-place">Apollo Hospital · {t("{km} km away", { km: "1.2" })}</div>
                  </div>
                </div>
                <span className="ll-critical-badge">{t("Critical")}</span>
              </div>

              <div className="ll-emergency-facts">
                <div>
                  <div className="ll-fact-label">{t("Group")}</div>
                  <div className="ll-fact-value ll-fact-value-emergency">
                    <Droplet size={16} fill="currentColor" />
                    O−
                  </div>
                </div>
                <div>
                  <div className="ll-fact-label">{t("Units")}</div>
                  <div className="ll-fact-value">3</div>
                </div>
                <div>
                  <div className="ll-fact-label">{t("Window")}</div>
                  <div className="ll-fact-value">
                    <Clock size={16} className="ll-fact-clock" />
                    45m
                  </div>
                </div>
              </div>

              <div className="ll-donor-list">
                {DONORS.map((donor, i) => (
                  <DonorRow
                    key={donor.name}
                    donor={donor}
                    index={i}
                    status={statuses[i]}
                    onRespond={(next) => respond(i, next)}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EmergencyMode;
