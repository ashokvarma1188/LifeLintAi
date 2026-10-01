/*
 * Sends email via the Gmail API (HTTPS) instead of raw SMTP — Render's free
 * tier blocks outbound SMTP entirely (ports 25/465/587 all fail), but a plain
 * HTTPS POST to googleapis.com works fine.
 *
 * Requires four env vars, obtained once via Google Cloud Console + OAuth
 * Playground (see server/.env.example for the full walkthrough):
 *   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_USER
 */

const isConfigured = () =>
  Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN &&
      process.env.GMAIL_USER
  );

// Cached across requests — an access token is valid for ~1 hour, so most
// sends reuse it instead of round-tripping to Google every time.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

const getAccessToken = async () => {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;

  const params = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    throw new Error(`Gmail token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Refresh a little early rather than cutting it exactly at expiry.
  cachedTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
};

const base64url = (str) =>
  Buffer.from(str).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const buildMimeMessage = ({ to, subject, text, html }) => {
  const boundary = `lifelink_${Date.now()}`;
  const lines = [
    `From: "LifeLink AI" <${process.env.GMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
    "",
    `--${boundary}--`,
  ];
  return lines.join("\r\n");
};

/**
 * Sends via the Gmail API, but NEVER throws — a failure (expired token,
 * network issue, anything) must degrade to `sent: false` (the caller falls
 * back to handing the link/code back in the API response) rather than
 * crashing the request with a 500. This matters most for 2FA: without this,
 * an account with 2FA enabled would be completely unable to log in whenever
 * mail delivery is broken.
 */
const trySend = async (mailOptions) => {
  if (!isConfigured()) return { sent: false };

  try {
    const accessToken = await getAccessToken();
    const raw = base64url(buildMimeMessage(mailOptions));

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      throw new Error(`Gmail API send failed: ${res.status} ${await res.text()}`);
    }

    return { sent: true };
  } catch (err) {
    console.error("Email send failed, falling back to in-response link/code:", err.message);
    return { sent: false };
  }
};

const sendPasswordResetEmail = (to, resetUrl) =>
  trySend({
    to,
    subject: "Reset your LifeLink AI password",
    text: `Reset your password using this link (expires in 1 hour): ${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>Reset your password using the link below (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
  });

const sendVerificationEmail = (to, verifyUrl) =>
  trySend({
    to,
    subject: "Verify your LifeLink AI email",
    text: `Verify your email using this link (expires in 24 hours): ${verifyUrl}`,
    html: `<p>Verify your email using the link below (expires in 24 hours):</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

const sendTwoFactorCode = (to, code) =>
  trySend({
    to,
    subject: "Your LifeLink AI sign-in code",
    text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your sign-in code is <strong style="font-size:20px">${code}</strong>. It expires in 10 minutes.</p>`,
  });

module.exports = { sendPasswordResetEmail, sendVerificationEmail, sendTwoFactorCode, isConfigured };
