import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/auth";
import { getErrorMessage } from "../services/api";
import AuthShell from "./AuthShell";
import PasswordField from "./PasswordField";
import { REQUESTABLE_ROLES, roleNeedsOrg } from "../services/admin";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    bloodGroup: "",
    phone: "",
    role: "civilian",
    orgName: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const needsOrg = roleNeedsOrg(form.role);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (needsOrg && !form.orgName.trim()) {
      setError("Organization name is required for this role");
      setLoading(false);
      return;
    }

    try {
      // register() stores the token the server hands back, so the new account
      // is already signed in — no second trip through the login form.
      const user = await register(form);
      setSuccess(
        user?.roleStatus === "pending"
          ? "Account created. An admin will review your organisation request."
          : "Account created. Taking you to your dashboard…"
      );
      setTimeout(() => navigate("/dashboard", { replace: true }), 900);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join LifeLink in a few seconds"
      error={error}
      success={success}
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="email">Email</label>
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
          label="Password"
          name="password"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={handleChange}
          minLength={6}
          autoComplete="new-password"
        />

        <div className="auth-field">
          <label htmlFor="role">I am signing up as</label>
          <div className="auth-select-wrap">
            <select id="role" name="role" value={form.role} onChange={handleChange}>
              {REQUESTABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {needsOrg && (
          <div className="auth-field">
            <label htmlFor="orgName">Organisation name *</label>
            <input
              id="orgName"
              type="text"
              name="orgName"
              placeholder="e.g. Apollo Hospital"
              value={form.orgName}
              onChange={handleChange}
            />
          </div>
        )}

        <div className="auth-row">
          <div className="auth-field">
            <label htmlFor="bloodGroup">Blood group</label>
            <div className="auth-select-wrap">
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={form.bloodGroup}
                onChange={handleChange}
                required={!needsOrg}
              >
                <option value="">Select</option>
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder="10-digit number"
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
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default Signup;
