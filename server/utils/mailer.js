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
    });
  }
  return transporter;
};

/**
 * Sends the reset link by email when EMAIL_USER/EMAIL_PASS are configured.
 * Otherwise returns `sent: false` so the caller can fall back to handing the
 * link back in the API response — convenient for local dev, but the site
 * owner should configure real email before relying on this in production.
 */
const sendPasswordResetEmail = async (to, resetUrl) => {
  if (!isConfigured()) return { sent: false };

  await getTransporter().sendMail({
    from: `"LifeLink AI" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your LifeLink AI password",
    text: `Reset your password using this link (expires in 1 hour): ${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>Reset your password using the link below (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
  });

  return { sent: true };
};

/** Same graceful degradation as sendPasswordResetEmail — see its comment above. */
const sendVerificationEmail = async (to, verifyUrl) => {
  if (!isConfigured()) return { sent: false };

  await getTransporter().sendMail({
    from: `"LifeLink AI" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your LifeLink AI email",
    text: `Verify your email using this link (expires in 24 hours): ${verifyUrl}`,
    html: `<p>Verify your email using the link below (expires in 24 hours):</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  return { sent: true };
};

const sendTwoFactorCode = async (to, code) => {
  if (!isConfigured()) return { sent: false };

  await getTransporter().sendMail({
    from: `"LifeLink AI" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your LifeLink AI sign-in code",
    text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your sign-in code is <strong style="font-size:20px">${code}</strong>. It expires in 10 minutes.</p>`,
  });

  return { sent: true };
};

module.exports = { sendPasswordResetEmail, sendVerificationEmail, sendTwoFactorCode, isConfigured };
