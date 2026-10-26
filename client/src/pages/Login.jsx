import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login, verifyTwoFactor, googleSignIn } from "../services/auth";
import { getErrorMessage } from "../services/api";
import AuthShell from "./AuthShell";
import PasswordField from "./PasswordField";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useLang } from "../i18n/context";
import { User, Hospital, ShieldCheck, Flame, Pill } from "lucide-react";

// Sandboxed demo accounts (see server/utils/demo.js): they only ever see demo data.
const DEMO_PASSWORD = "Demo@12345";
const DEMO_ACCOUNTS = [
  { key: "civilian", label: "Civilian", email: "ravi@demo.lifelink.app", icon: User },
  { key: "hospital", label: "Hospital", email: "hospital@demo.lifelink.app", icon: Hospital },
  { key: "police", label: "Police", email: "police@demo.lifelink.app", icon: ShieldCheck },
  { key: "fire", label: "Fire station", email: "fire@demo.lifelink.app", icon: Flame },
  { key: "pharmacy", label: "Pharmacy", email: "pharmacy@demo.lifelink.app", icon: Pill },
];

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Once the password checks out and the account has 2FA on, we hold here
  // until the emailed code is entered — no token has been issued yet.
  const [pending2FA, setPending2FA] = useState(null); // { userId, devCode }
  const [code, setCode] = useState("");

  // Set by ProtectedRoute when it bounces a signed-out user, so we can send
  // them back where they were headed.
  const redirectTo = location.state?.from || "/dashboard";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(form);
      if (result?.requires2FA) {
        setPending2FA({ userId: result.userId, devCode: result.devCode });
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const tryDemo = async (account) => {
    setError("");
    setLoading(true);
    setForm({ email: account.email, password: DEMO_PASSWORD });
    try {
      await login({ email: account.email, password: DEMO_PASSWORD });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t("The demo isn't available right now. Please try again.")));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError("");
    setLoading(true);
    try {
      const result = await googleSignIn(credential);
      if (result?.requires2FA) {
        setPending2FA({ userId: result.userId, devCode: result.devCode });
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err, t("Could not sign in with Google.")));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verifyTwoFactor(pending2FA.userId, code);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, t("That code is invalid or has expired.")));
    } finally {
      setLoading(false);
    }
  };

  if (pending2FA) {
    return (
      <AuthShell
        title={t("Enter your code")}
        subtitle={t("We sent a 6-digit code to your email.")}
        error={error}
        footer={
          <button type="button" onClick={() => setPending2FA(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ll-primary)", fontWeight: 500 }}>
            {t("Back to sign in")}
          </button>
        }
      >
        <form className="auth-form" onSubmit={handleVerifyCode} noValidate>
          <div className="auth-field">
            <label htmlFor="code">{t("6-digit code")}</label>
            <input
              id="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
              autoFocus
              required
            />
          </div>

          {pending2FA.devCode && (
            <div className="auth-message" style={{ fontSize: 13 }}>
              {t("Email isn't configured on this deployment yet — your code is")} <strong>{pending2FA.devCode}</strong>.
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={loading || code.length !== 6}>
            {loading ? t("Verifying…") : t("Verify and sign in")}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("Welcome back")}
      subtitle={t("Sign in to your LifeLink account")}
      error={error}
      footer={
        <>
          {t("Don't have an account?")} <Link to="/signup">{t("Create one")}</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="email">{t("Email")}</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>

        <PasswordField
          label={t("Password")}
          name="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
        />

        <Link to="/forgot-password" className="auth-forgot-link">
          {t("Forgot password?")}
        </Link>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              {t("Signing in…")}
            </>
          ) : (
            t("Sign in")
          )}
        </button>
      </form>

      <div className="auth-divider">
        <span>{t("or")}</span>
      </div>
      <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />

      <div className="auth-demo">
        <p className="auth-demo-title">{t("Try a demo account")}</p>
        <p className="auth-demo-hint">{t("One tap, no sign-up. Demo accounts only see demo data.")}</p>
        <div className="auth-demo-grid">
          {DEMO_ACCOUNTS.map(({ key, label, email, icon: Icon }) => (
            <button key={key} type="button" className="auth-demo-btn" onClick={() => tryDemo({ email })} disabled={loading}>
              <Icon size={16} /> {t(label)}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}

export default Login;
