const nodemailer = require("nodemailer");

const isConfigured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    // Port 465 (SMTPS) is blocked outbound on some hosts, including Render's free
    // tier — 587 with STARTTLS is far more commonly left open.
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      // Belt-and-suspenders alongside dns.setDefaultResultOrder("ipv4first") in
      // server.js — some hosts have no outbound IPv6 route and fail with ENETUNREACH.
      family: 4,
    });
  }
  return transporter;
};

/**
 * Sends via nodemailer when configured, but NEVER throws — a down/blocked SMTP
 * connection must degrade to `sent: false` (the caller falls back to handing the
 * link/code back in the API response) rather than crashing the request with a
 * 500. This matters most for 2FA: without this, an account with 2FA enabled
 * would be completely unable to log in whenever mail delivery is broken.
 */
const trySend = async (mailOptions) => {
  if (!isConfigured()) return { sent: false };

  try {
    await getTransporter().sendMail({ from: `"LifeLink AI" <${process.env.EMAIL_USER}>`, ...mailOptions });
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
