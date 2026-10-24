import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, CheckCircle2, Siren, MapPinned, Sparkles } from "lucide-react";
import BloodDrop from "../landing/components/BloodDrop";
import ThemeToggle from "../landing/components/ThemeToggle";
import { useLightTheme } from "../landing/useLightTheme";
import "../landing/theme.css";
import "./auth.css";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useLang } from "../i18n/context";

const HIGHLIGHTS = [
  { icon: Siren, text: "One SOS reaches hospital, police and fire", tone: "red" },
  { icon: MapPinned, text: "Live tracking on the real road route", tone: "green" },
  { icon: Sparkles, text: "AI first-aid in your language", tone: "green" },
];

const STATS = [
  ["6", "Roles"],
  ["3", "Languages"],
  ["< 1 s", "Nearest match"],
];

/**
 * Shared frame for sign-in and sign-up: a brand panel (on wide screens) beside a
 * frosted-glass card, over the landing page's glowing background.
 */
function AuthShell({ title, subtitle, error, success, children, footer }) {
  // Shared with the landing page so the choice carries over between them.
  const [light, setLight] = useLightTheme();
  const { t } = useLang();

  return (
    <div className={`ll-root${light ? " ll-light" : ""}`}>
      <ThemeToggle light={light} onToggle={() => setLight((v) => !v)} />
      <LanguageSwitcher variant="floating" />
      <div className="auth-page">
        <div className="ll-grid-bg auth-grid" aria-hidden="true" />
        <div className="ll-aurora" aria-hidden="true">
          <span className="ll-aurora-green" />
          <span className="ll-aurora-red" />
        </div>

        <div className="auth-layout">
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="auth-side"
          >
            <div className="auth-side-brand">
              <BloodDrop size={26} />
              <span>
                Life<span className="ll-text-gradient-success">Link</span> AI
              </span>
            </div>

            <h2 className="auth-side-title">
              {t("Help arrives faster")}
              <br />
              <span className="ll-text-gradient-success auth-glow-text">{t("when every second counts.")}</span>
            </h2>
            <p className="auth-side-sub">{t("One app connecting civilians, hospitals, police and fire stations in real time.")}</p>

            <svg className="auth-ekg" viewBox="0 0 520 80" aria-hidden="true">
              <path d="M0 40 H170 L192 12 L220 70 L244 24 L258 40 H330 L346 30 L360 48 L372 40 H520" />
            </svg>

            <ul className="auth-highlights">
              {HIGHLIGHTS.map(({ icon: Icon, text, tone }) => (
                <li key={text}>
                  <span className={`auth-highlight-icon ${tone}`}>
                    <Icon size={17} />
                  </span>
                  {t(text)}
                </li>
              ))}
            </ul>

            <div className="auth-stats">
              {STATS.map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{t(label)}</span>
                </div>
              ))}
            </div>
          </motion.aside>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="auth-shell"
          >
            <Link to="/" className="auth-back">
              <ArrowLeft size={14} />
              {t("Back to home")}
            </Link>

            <div className="ll-glass auth-card">
              <span className="auth-card-rule" aria-hidden="true" />

              <div className="auth-brand">
                <BloodDrop size={22} />
                <span className="auth-brand-text">
                  Life<span className="ll-text-gradient-success">Link</span>
                </span>
              </div>

              <h1 className="auth-title">{title}</h1>
              <p className="auth-subtitle">{subtitle}</p>

              {error && (
                <div className="auth-message error" role="alert">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="auth-message success" role="status">
                  <CheckCircle2 size={15} />
                  <span>{success}</span>
                </div>
              )}

              {children}

              <div className="auth-switch">{footer}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AuthShell;
