import { Link } from "react-router-dom";
import PublicLayout from "../landing/PublicLayout";
import { useLang } from "../i18n/context";
import { isAuthenticated } from "../services/auth";
import "./NotFound.css";

/** Any address that isn't a real page, e.g. a mistyped link or an old bookmark. */
function NotFound() {
  const { t } = useLang();
  const signedIn = isAuthenticated();

  return (
    <PublicLayout>
      <div className="pp-container nf-wrap">
        <svg className="nf-ekg" viewBox="0 0 240 60" aria-hidden="true">
          <path d="M0 30 H70 L82 10 L96 50 L108 20 L116 30 H240" />
        </svg>
        <p className="pp-eyebrow">{t("Error 404")}</p>
        <h1 className="pp-title">{t("This page doesn't exist")}</h1>
        <p className="pp-subtitle nf-sub">
          {t("The link may be mistyped, or the page has moved. Everything important is one tap away.")}
        </p>
        <div className="nf-actions">
          <Link to={signedIn ? "/dashboard" : "/"} className="ll-btn ll-btn-primary">
            {signedIn ? t("Go to dashboard") : t("Go to home page")}
          </Link>
          <Link to="/first-aid" className="ll-btn ll-btn-ghost">
            {t("First-Aid Guide")}
          </Link>
        </div>
        <a className="nf-emergency" href="tel:112">
          {t("In an emergency, call 112")}
        </a>
      </div>
    </PublicLayout>
  );
}

export default NotFound;
