import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import BloodDrop from "../landing/components/BloodDrop";
import "../landing/theme.css";
import "./auth.css";

/**
 * Shared frame for sign-in and sign-up: landing-matched background, brand mark,
 * glass card, and the error/success message slots.
 */
function AuthShell({ title, subtitle, error, success, children, footer }) {
  return (
    <div className="ll-root">
      <div className="auth-page">
        <div className="ll-grid-bg auth-grid" aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="auth-shell"
        >
          <Link to="/" className="auth-back">
            <ArrowLeft size={14} />
            Back to home
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
  );
}

export default AuthShell;
