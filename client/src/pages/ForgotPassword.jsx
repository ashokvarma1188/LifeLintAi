import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/auth";
import { getErrorMessage } from "../services/api";
import AuthShell from "./AuthShell";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setDevResetUrl("");
    setLoading(true);

    try {
      const data = await forgotPassword(email.trim());
      setSuccess(data.message);
      // Only present when the server has no email transport configured yet.
      if (data.resetUrl) setDevResetUrl(data.resetUrl);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
      error={error}
      success={success}
      footer={
        <>
          Remembered it? <Link to="/login">Back to sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      {devResetUrl && (
        <div className="auth-message" style={{ marginTop: 14, wordBreak: "break-all" }}>
          Email isn&apos;t configured on this deployment yet, so here&apos;s your link directly:{" "}
          <Link to={devResetUrl.replace(window.location.origin, "")}>{devResetUrl}</Link>
        </div>
      )}
    </AuthShell>
  );
}

export default ForgotPassword;
