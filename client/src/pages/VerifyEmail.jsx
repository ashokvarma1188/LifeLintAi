import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { verifyEmail } from "../services/auth";
import { getErrorMessage } from "../services/api";
import { getUser } from "../services/auth";
import AuthShell from "./AuthShell";

function VerifyEmail() {
  const { token } = useParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await verifyEmail(token);
        setSuccess(data.message);

        // Keep the cached user in sync if they're already signed in on this device.
        const cached = getUser();
        if (cached) {
          cached.emailVerified = true;
          localStorage.setItem("user", JSON.stringify(cached));
        }
      } catch (err) {
        setError(getErrorMessage(err, "This verification link is invalid or has expired."));
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <AuthShell
      title="Email verification"
      subtitle={loading ? "Checking your link…" : ""}
      error={error}
      success={success}
      footer={
        <>
          <Link to="/dashboard">Go to dashboard</Link>
        </>
      }
    >
      {!loading && !success && !error && null}
    </AuthShell>
  );
}

export default VerifyEmail;
