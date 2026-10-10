import { Component } from "react";
import { LanguageContext } from "../i18n/context";
import "./ErrorBoundary.css";

const RELOAD_FLAG = "ll-chunk-reload";

// After a new deploy, a tab that's still open asks for the old page files, which no
// longer exist. Reloading once fetches the new version.
const isChunkError = (error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    String(error?.message || error)
  );

/**
 * Catches a crash anywhere in the app and shows a way out, instead of a blank white
 * screen. Because this is an emergency app, the crash screen always shows the 112 number.
 */
class ErrorBoundary extends Component {
  static contextType = LanguageContext;

  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (isChunkError(error)) {
      // Reload at most once every 10 s, so a file that's really missing can't cause a reload loop.
      let last = 0;
      try {
        last = Number(sessionStorage.getItem(RELOAD_FLAG)) || 0;
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      } catch {
        /* storage blocked — still try one reload */
      }
      if (Date.now() - last > 10000) {
        window.location.reload();
        return;
      }
    }
    console.error("LifeLink crashed:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { t } = this.context;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;

    return (
      <div className="crash-screen" role="alert">
        <div className="crash-card">
          <div className="crash-icon" aria-hidden="true">!</div>
          <h1>{t("Something went wrong")}</h1>
          <p>
            {offline
              ? t("You seem to be offline. Reconnect and reload the page.")
              : t("This page hit an unexpected problem. Reloading usually fixes it.")}
          </p>
          <div className="crash-actions">
            <button type="button" className="crash-btn primary" onClick={() => window.location.reload()}>
              {t("Reload page")}
            </button>
            <a className="crash-btn" href="/dashboard">
              {t("Go to dashboard")}
            </a>
            <a className="crash-btn" href="/first-aid">
              {t("First-Aid Guide")}
            </a>
          </div>
          <a className="crash-emergency" href="tel:112">
            {t("In an emergency, call 112")}
          </a>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
