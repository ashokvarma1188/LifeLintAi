import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Phone, ChevronDown, CircleAlert, BadgeCheck, CloudOff, BookHeart } from "lucide-react";
import AppNavbar from "./AppNavbar";
import FIRST_AID_GUIDES, { EMERGENCY_LINES } from "../data/firstAidGuide";
import { isAuthenticated } from "../services/auth";
import "./Dashboard.css";
import "./portal.css";
import "./FirstAidGuide.css";

/** Step-by-step first aid that works with no connection (the app shell is cached by the service worker). */
function FirstAidGuide() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const signedIn = isAuthenticated();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then((registration) => setOfflineReady(Boolean(registration?.active)));
  }, []);

  const q = query.trim().toLowerCase();
  const guides = q
    ? FIRST_AID_GUIDES.filter((g) => `${g.title} ${g.summary} ${g.keywords}`.toLowerCase().includes(q))
    : FIRST_AID_GUIDES;

  return (
    <div className="portal-page">
      {signedIn ? (
        <AppNavbar showLogout />
      ) : (
        <div className="fa-public-head">
          <Link to="/" className="fa-brand">
            <BookHeart size={18} /> LifeLink AI
          </Link>
        </div>
      )}

      <div className="portal-content">
        <div className="portal-head">
          <div>
            <h1>First-Aid Guide</h1>
            <p>Clear steps for common emergencies — works even without internet.</p>
          </div>
          <span className={`fa-offline-badge ${offlineReady ? "ready" : ""}`}>
            {offlineReady ? <BadgeCheck size={14} /> : <CloudOff size={14} />}
            {offlineReady ? "Saved for offline use" : "Opens offline after your first visit"}
          </span>
        </div>

        <div className="fa-call-strip">
          {EMERGENCY_LINES.map((line) => (
            <a key={line.number} href={`tel:${line.number.replace(/-/g, "")}`} className="fa-call">
              <Phone size={14} />
              <span>
                <strong>{line.number}</strong>
                {line.label}
              </span>
            </a>
          ))}
        </div>

        <div className="fa-search">
          <Search size={16} />
          <input
            placeholder="Search — e.g. burn, choking, snake"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search first-aid topics"
          />
        </div>

        {guides.length === 0 && <div className="portal-empty">No topic matches “{query}”. Try another word, or call 112.</div>}

        <div className="fa-list">
          {guides.map((guide) => {
            const Icon = guide.icon;
            const open = openId === guide.id || (q && guides.length === 1);
            return (
              <div key={guide.id} className={`fa-item ${open ? "open" : ""}`}>
                <button className="fa-item-head" onClick={() => setOpenId(open ? null : guide.id)} aria-expanded={Boolean(open)}>
                  <span className="fa-item-icon">
                    <Icon size={20} />
                  </span>
                  <span className="fa-item-text">
                    <strong>{guide.title}</strong>
                    <span>{guide.summary}</span>
                  </span>
                  <ChevronDown size={18} className="fa-chevron" />
                </button>

                {open && (
                  <div className="fa-item-body">
                    <ol className="fa-steps">
                      {guide.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <div className="fa-dont">
                      <strong>
                        <CircleAlert size={14} /> Don&apos;t
                      </strong>
                      <ul>
                        {guide.dont.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="fa-call-when">
                      <Phone size={13} /> <span><strong>Call for help:</strong> {guide.callWhen}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="fa-disclaimer">
          General first-aid guidance only — not a substitute for professional medical care or a first-aid course. In an
          emergency, call 112 first.
        </p>
      </div>
    </div>
  );
}

export default FirstAidGuide;
