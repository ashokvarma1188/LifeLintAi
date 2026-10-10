import { useEffect, useState } from "react";
import { useLang } from "../i18n/context";
import "./PageLoader.css";

/**
 * Shown while a page's code downloads. It stays invisible for the first 250 ms, so fast
 * loads don't flash a spinner.
 */
function PageLoader() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`page-loader${visible ? " visible" : ""}`} role="status" aria-live="polite">
      <svg className="page-loader-ekg" viewBox="0 0 120 40" aria-hidden="true">
        <path d="M0 20 H38 L46 6 L56 34 L64 14 L70 20 H120" />
      </svg>
      <span className="page-loader-text">{t("Loading…")}</span>
    </div>
  );
}

export default PageLoader;
