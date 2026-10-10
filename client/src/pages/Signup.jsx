import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register, googleSignIn } from "../services/auth";
import { getErrorMessage } from "../services/api";
import AuthShell from "./AuthShell";
import PasswordField from "./PasswordField";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { REQUESTABLE_ROLES, roleNeedsOrg } from "../services/admin";
import { useLang } from "../i18n/context";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function Signup() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    bloodGroup: "",
    phone: "",
    role: "civilian",
    orgName: "",
    licenseNumber: "",
  });
  const [docFile, setDocFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const needsOrg = roleNeedsOrg(form.role);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleGoogleCredential = async (credential) => {
    setError("");
    setLoading(true);
    try {
      const result = await googleSignIn(credential);
      if (result?.requires2FA) {
        setError(t("This account has 2-factor authentication on — please sign in from the Login page instead."));
        setLoading(false);
        return;
      }
      setSuccess(t("Signed in with Google. Taking you to your dashboard…"));
      setTimeout(() => navigate("/dashboard", { replace: true }), 600);
    } catch (err) {
      setError(getErrorMessage(err, t("Could not sign in with Google.")));
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (needsOrg && !form.orgName.trim()) {
      setError(t("Organization name is required for this role"));
      setLoading(false);
      return;
    }

    try {
      // register() stores the token the server hands back, so the new account
      // is already signed in — no second trip through the login form.
      const user = await register(form, docFile);
      setSuccess(
        user?.roleStatus === "pending"
          ? t("Account created. An admin will review your organisation request.")
          : t("Account created. Taking you to your dashboard…")
      );
      setTimeout(() => navigate("/dashboard", { replace: true }), 900);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("Create your account")}
      subtitle={t("Join LifeLink in a few seconds")}
      error={error}
      success={success}
      footer={
        <>
          {t("Already have an account?")} <Link to="/login">{t("Sign in")}</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="name">{t("Full name")}</label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder={t("Your name")}
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
            required
          />
        </div>

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
          placeholder={t("At least 6 characters")}
          value={form.password}
          onChange={handleChange}
          minLength={6}
          autoComplete="new-password"
        />

        <div className="auth-field">
          <label htmlFor="role">{t("I am signing up as")}</label>
          <div className="auth-select-wrap">
            <select id="role" name="role" value={form.role} onChange={handleChange}>
              {REQUESTABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{t(r.label)}</option>
              ))}
            </select>
          </div>
        </div>

        {needsOrg && (
          <>
            <div className="auth-field">
              <label htmlFor="orgName">{t("Organisation name")} *</label>
              <input
                id="orgName"
                type="text"
                name="orgName"
                placeholder={t("e.g. Apollo Hospital")}
                value={form.orgName}
                onChange={handleChange}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="licenseNumber">{t("Licence / registration number")}</label>
              <input
                id="licenseNumber"
                type="text"
                name="licenseNumber"
                placeholder={t("e.g. your hospital/pharmacy registration number")}
                value={form.licenseNumber}
                onChange={handleChange}
              />
              <span className="hint">{t("Optional, but helps admin verify your organisation faster.")}</span>
            </div>

            <div className="auth-field">
              <label htmlFor="doc">{t("Proof / registration document (optional)")}</label>
              <input
                id="doc"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              />
              <span className="hint">{t("PDF only, up to 4 MB. Helps admin verify your organisation faster.")}</span>
            </div>
          </>
        )}

        <div className="auth-row">
          <div className="auth-field">
            <label htmlFor="bloodGroup">{t("Blood group")}</label>
            <div className="auth-select-wrap">
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={form.bloodGroup}
                onChange={handleChange}
                required={!needsOrg}
              >
                <option value="">{t("Select")}</option>
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="phone">{t("Phone")}</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder={t("10-digit number")}
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              required={!needsOrg}
            />
          </div>
        </div>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              {t("Creating account…")}
            </>
          ) : (
            t("Create account")
          )}
        </button>
      </form>

      {!needsOrg && (
        <>
          <div className="auth-divider">
            <span>{t("or")}</span>
          </div>
          <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />
        </>
      )}
    </AuthShell>
  );
}

export default Signup;
