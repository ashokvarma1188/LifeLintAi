/*
 * Certificates and the one-page health summary, as downloadable PDFs.
 *
 * Each page is drawn on a <canvas> first, so Hindi and Telugu text is shaped by the
 * browser's own fonts (PDF libraries can't join Indic letters correctly), and the canvas
 * is then placed into an A4 PDF. jsPDF and qrcode load only when someone downloads.
 */

const FONT_STACK = '"Segoe UI", Roboto, "Noto Sans Devanagari", "Noto Sans Telugu", "Nirmala UI", Helvetica, Arial, sans-serif';
const font = (size, weight = 400) => `${weight} ${size}px ${FONT_STACK}`;

const C = {
  green: "#0f9d63",
  deep: "#0a3d2a",
  gold: "#c9a227",
  red: "#d63a3a",
  ink: "#16211c",
  muted: "#5c6b64",
  line: "#dfe8e3",
  paper: "#fffdf8",
};

const localeFor = (lang) => ({ hi: "hi-IN", te: "te-IN" }[lang] || "en-IN");
export const formatDate = (value, lang) =>
  new Intl.DateTimeFormat(localeFor(lang), { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));

function makeCanvas(width, height, background = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function qrImage(text, size) {
  const QRCode = (await import("qrcode")).default;
  return loadImage(await QRCode.toDataURL(text, { margin: 1, width: size, errorCorrectionLevel: "M", color: { dark: C.ink, light: "#ffffff" } }));
}

/** Splits text into lines that fit `maxWidth` with the current ctx.font. */
function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of String(text || "").split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    // A single word wider than the line (long URLs, names): break it by characters.
    while (ctx.measureText(line).width > maxWidth && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut -= 1;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws wrapped text and returns the y below it. Extra lines beyond maxLines end in "…". */
function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99) {
  const lines = wrapLines(ctx, text, maxWidth);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown[maxLines - 1] = `${shown[maxLines - 1].replace(/.{0,2}$/, "")}…`;
  shown.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return y + shown.length * lineHeight;
}

/** Largest font size (down to `min`) at which text fits in maxWidth. */
function fitFont(ctx, text, maxWidth, size, weight, min = 40) {
  let current = size;
  ctx.font = font(current, weight);
  while (current > min && ctx.measureText(text).width > maxWidth) {
    current -= 4;
    ctx.font = font(current, weight);
  }
  return current;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The LifeLink heartbeat line, centred on cx. */
function drawEkg(ctx, cx, y, width, color, lineWidth = 6) {
  const left = cx - width / 2;
  const u = width / 12;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left + 4.2 * u, y);
  ctx.lineTo(left + 4.9 * u, y - 1.3 * u);
  ctx.lineTo(left + 5.7 * u, y + 1.3 * u);
  ctx.lineTo(left + 6.4 * u, y - 0.7 * u);
  ctx.lineTo(left + 6.9 * u, y);
  ctx.lineTo(left + width, y);
  ctx.stroke();
  ctx.restore();
}

/** A blood-drop mark used as the logo. */
function drawDrop(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.bezierCurveTo(cx + size * 0.9, cy - size * 0.1, cx + size * 0.75, cy + size * 0.75, cx, cy + size * 0.75);
  ctx.bezierCurveTo(cx - size * 0.75, cy + size * 0.75, cx - size * 0.9, cy - size * 0.1, cx, cy - size);
  ctx.fill();
  ctx.restore();
}

async function savePdf(canvas, filename, orientation) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, width, height);
  pdf.save(filename);
}

const safeFileName = (text) => String(text || "LifeLink").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "LifeLink";

/* --------------------------------------------------------------- certificates */

/**
 * `certificate` comes from the API ({ code, kind, recipientName, meta, issuedAt }).
 * Text follows the language chosen in the app.
 */
export async function downloadCertificate(certificate, t, lang) {
  await document.fonts?.ready;
  const W = 2339;
  const H = 1654;
  const { canvas, ctx } = makeCanvas(W, H, C.paper);
  const isDonation = certificate.kind === "blood_donation";
  const accent = isDonation ? C.red : C.green;
  const cx = W / 2;

  // Frame
  ctx.strokeStyle = accent;
  ctx.lineWidth = 14;
  ctx.strokeRect(56, 56, W - 112, H - 112);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 4;
  ctx.strokeRect(92, 92, W - 184, H - 184);
  for (const [x, y] of [[92, 92], [W - 92, 92], [92, H - 92], [W - 92, H - 92]]) {
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x + 22, y);
    ctx.lineTo(x, y + 22);
    ctx.lineTo(x - 22, y);
    ctx.closePath();
    ctx.fill();
  }

  // Logo
  ctx.textAlign = "left";
  ctx.font = font(54, 700);
  const brand = "LifeLink AI";
  const brandWidth = ctx.measureText(brand).width;
  drawDrop(ctx, cx - brandWidth / 2 - 40, 222, 34, C.red);
  ctx.fillStyle = C.deep;
  ctx.fillText(brand, cx - brandWidth / 2 + 4, 240);

  // Title
  ctx.textAlign = "center";
  ctx.fillStyle = C.deep;
  fitFont(ctx, t(isDonation ? "Certificate of Appreciation" : "Certificate of Completion"), W - 500, 104, 700);
  ctx.fillText(t(isDonation ? "Certificate of Appreciation" : "Certificate of Completion"), cx, 385);
  drawEkg(ctx, cx, 492, 480, accent, 7);

  ctx.fillStyle = C.muted;
  ctx.font = font(44);
  ctx.fillText(t("This is to certify that"), cx, 625);

  // Name
  ctx.fillStyle = C.ink;
  fitFont(ctx, certificate.recipientName, 1700, 128, 700, 64);
  ctx.fillText(certificate.recipientName, cx, 780);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 650, 830);
  ctx.lineTo(cx + 650, 830);
  ctx.stroke();

  // What for
  ctx.fillStyle = C.ink;
  ctx.font = font(48);
  const body = isDonation
    ? t("has selflessly donated blood and helped save up to 3 lives.")
    : t("has completed the LifeLink first-aid course and is First-Aid Aware.");
  let y = drawWrapped(ctx, body, cx, 940, 1700, 66, 2);

  ctx.fillStyle = C.muted;
  ctx.font = font(38);
  const meta = certificate.meta || {};
  const detail = isDonation
    ? [t("Donation #{n}", { n: meta.donationNumber || 1 }), meta.place, meta.bloodGroup && t("Blood group {group}", { group: meta.bloodGroup })]
        .filter(Boolean)
        .join("  ·  ")
    : t("Quiz score: {score} out of {total}", { score: meta.score, total: meta.total });
  drawWrapped(ctx, detail, cx, y + 30, 1700, 52, 2);

  // Bottom left: date and signature
  ctx.textAlign = "left";
  const left = 230;
  ctx.fillStyle = C.muted;
  ctx.font = font(32);
  ctx.fillText(t("Issued on"), left, 1290);
  ctx.fillStyle = C.ink;
  ctx.font = font(44, 600);
  ctx.fillText(formatDate(certificate.issuedAt, lang), left, 1350);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left, 1440);
  ctx.lineTo(left + 520, 1440);
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = font(30);
  ctx.fillText("LifeLink AI · lifelinkai-app.vercel.app", left, 1486);

  // Centre: seal
  const sealY = 1370;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(cx, sealY, 128, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, sealY, 112, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  if (isDonation) drawDrop(ctx, cx, sealY - 10, 48, "#ffffff");
  else drawEkg(ctx, cx, sealY - 12, 150, "#ffffff", 8);
  ctx.fillStyle = "#ffffff";
  ctx.font = font(26, 700);
  ctx.fillText(new Date(certificate.issuedAt).getFullYear().toString(), cx, sealY + 72);

  // Bottom right: verification QR
  const verifyUrl = `${window.location.origin}/verify/${certificate.code}`;
  const qr = await qrImage(verifyUrl, 260);
  const qrX = W - 230 - 260;
  ctx.drawImage(qr, qrX, 1190, 260, 260);
  ctx.fillStyle = C.muted;
  ctx.font = font(28);
  ctx.fillText(t("Scan to verify"), qrX + 130, 1490);
  ctx.fillStyle = C.ink;
  ctx.font = font(30, 700);
  ctx.fillText(certificate.code, qrX + 130, 1530);

  const prefix = isDonation ? "Blood-Donor-Certificate" : "First-Aid-Certificate";
  await savePdf(canvas, `${prefix}-${safeFileName(certificate.recipientName)}.pdf`, "landscape");
}

/* ------------------------------------------------------------ health summary */

/**
 * One A4 page a person can print or hand to a doctor: blood group, allergies,
 * conditions, medicines, recent vitals, contacts, organ pledge and the Medical ID QR.
 */
export async function downloadHealthSummary({ profile, medicines, records }, t, lang) {
  await document.fonts?.ready;
  const W = 1654;
  const H = 2339;
  const M = 100;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.textAlign = "left";

  // Header band
  ctx.fillStyle = C.green;
  ctx.fillRect(0, 0, W, 250);
  drawEkg(ctx, W - 330, 120, 420, "rgba(255,255,255,0.35)", 6);
  drawDrop(ctx, M + 26, 92, 26, "#ffffff");
  ctx.fillStyle = "#ffffff";
  ctx.font = font(36, 700);
  ctx.fillText("LifeLink AI", M + 66, 106);
  ctx.font = font(72, 700);
  ctx.fillText(t("Health Summary"), M, 196);
  ctx.textAlign = "right";
  ctx.font = font(28);
  ctx.fillText(formatDate(new Date(), lang), W - M, 196);
  ctx.textAlign = "left";

  // Patient
  let y = 350;
  ctx.fillStyle = C.ink;
  fitFont(ctx, profile.name || "", 1000, 64, 700, 40);
  ctx.fillText(profile.name || "", M, y);
  ctx.fillStyle = C.muted;
  ctx.font = font(32);
  const facts = [profile.age && t("Age {age}", { age: profile.age }), profile.phone].filter(Boolean).join("  ·  ");
  if (facts) ctx.fillText(facts, M, y + 56);

  // Blood group badge
  const group = profile.bloodGroup || "—";
  roundRect(ctx, W - M - 260, 268, 260, 150, 24);
  ctx.fillStyle = C.red;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = font(26, 600);
  ctx.fillText(t("Blood group"), W - M - 130, 318);
  ctx.font = font(64, 800);
  ctx.fillText(group, W - M - 130, 392);
  ctx.textAlign = "left";

  y = 500;
  const section = (title) => {
    ctx.fillStyle = C.green;
    ctx.font = font(36, 700);
    ctx.fillText(title, M, y);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(M, y + 20);
    ctx.lineTo(W - M, y + 20);
    ctx.stroke();
    y += 72;
  };
  const none = () => {
    ctx.fillStyle = C.muted;
    ctx.font = font(30);
    ctx.fillText(t("None recorded"), M, y);
    y += 70;
  };

  // Allergies as red chips
  section(t("Allergies"));
  const allergies = (profile.allergies || []).filter(Boolean);
  if (!allergies.length) none();
  else {
    ctx.font = font(30, 600);
    let x = M;
    for (const allergy of allergies.slice(0, 10)) {
      const w = ctx.measureText(allergy).width + 48;
      if (x + w > W - M) {
        x = M;
        y += 66;
      }
      roundRect(ctx, x, y - 38, w, 54, 27);
      ctx.fillStyle = "#fdecea";
      ctx.fill();
      ctx.fillStyle = C.red;
      ctx.fillText(allergy, x + 24, y);
      x += w + 14;
    }
    y += 80;
  }

  section(t("Medical conditions"));
  const conditions = (profile.medicalHistory || []).filter(Boolean);
  if (!conditions.length) none();
  else {
    ctx.fillStyle = C.ink;
    ctx.font = font(30);
    y = drawWrapped(ctx, conditions.join(", "), M, y, W - 2 * M, 44, 3) + 30;
  }

  section(t("Current medicines"));
  const activeMeds = (medicines || []).filter((m) => m.active);
  if (!activeMeds.length) none();
  else {
    for (const med of activeMeds.slice(0, 6)) {
      ctx.fillStyle = C.ink;
      ctx.font = font(30, 600);
      const name = [med.name, med.dose].filter(Boolean).join(" — ");
      ctx.fillText(name.length > 48 ? `${name.slice(0, 47)}…` : name, M, y);
      ctx.fillStyle = C.muted;
      ctx.font = font(28);
      ctx.textAlign = "right";
      ctx.fillText(med.times.join(", "), W - M, y);
      ctx.textAlign = "left";
      y += 50;
    }
    if (activeMeds.length > 6) {
      ctx.fillStyle = C.muted;
      ctx.font = font(26);
      ctx.fillText(t("+{count} more", { count: activeMeds.length - 6 }), M, y);
      y += 44;
    }
    y += 26;
  }

  section(t("Recent vitals"));
  const vitals = (records || [])
    .filter((r) => r.bloodPressure || r.heartRate || r.bloodSugar || r.weight)
    .sort((a, b) => String(b.recordDate).localeCompare(String(a.recordDate)))
    .slice(0, 5);
  if (!vitals.length) none();
  else {
    const cols = [
      [t("Date"), M],
      [t("Blood pressure"), M + 300],
      [t("Heart rate"), M + 640],
      [t("Blood sugar"), M + 920],
      [t("Weight"), M + 1220],
    ];
    ctx.fillStyle = C.muted;
    ctx.font = font(26, 600);
    for (const [label, x] of cols) ctx.fillText(label, x, y);
    y += 48;
    ctx.font = font(30);
    for (const r of vitals) {
      ctx.fillStyle = C.ink;
      const cells = [r.recordDate, r.bloodPressure || "—", r.heartRate ? `${r.heartRate} bpm` : "—", r.bloodSugar ? `${r.bloodSugar} mg/dL` : "—", r.weight ? `${r.weight} kg` : "—"];
      cells.forEach((cell, i) => ctx.fillText(String(cell), cols[i][1], y));
      y += 48;
    }
    y += 30;
  }

  // Contacts (left) and organ pledge, with the Medical ID QR (right)
  const qrSize = 260;
  const hasQr = Boolean(profile.medicalIdToken);
  const colWidth = hasQr ? W - 2 * M - qrSize - 60 : W - 2 * M;
  const blockTop = y;

  section(t("Emergency contacts"));
  const contacts = (profile.emergencyContacts || []).filter((c) => c.name || c.phone);
  if (!contacts.length) none();
  else {
    for (const contact of contacts.slice(0, 3)) {
      ctx.fillStyle = C.ink;
      ctx.font = font(30, 600);
      ctx.fillText(`${contact.name || ""}${contact.relation ? ` (${contact.relation})` : ""}`, M, y);
      ctx.fillStyle = C.muted;
      ctx.font = font(30);
      ctx.textAlign = "right";
      ctx.fillText(contact.phone || "", M + colWidth, y);
      ctx.textAlign = "left";
      y += 50;
    }
    y += 26;
  }

  section(t("Organ donor"));
  ctx.fillStyle = C.ink;
  ctx.font = font(30);
  const pledge = profile.organPledge;
  y = drawWrapped(
    ctx,
    pledge?.pledged ? t("Pledged: {organs}", { organs: (pledge.organs || []).map((o) => t(o)).join(", ") || t("All organs") }) : t("Not pledged"),
    M, y, colWidth, 44, 2
  );

  if (hasQr) {
    const qr = await qrImage(`${window.location.origin}/id/${profile.medicalIdToken}`, qrSize);
    const qrX = W - M - qrSize;
    const qrY = Math.max(blockTop + 10, Math.min(y - qrSize, H - 420));
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = C.muted;
    ctx.font = font(24);
    ctx.textAlign = "center";
    drawWrapped(ctx, t("Scan for the live Medical ID"), qrX + qrSize / 2, qrY + qrSize + 38, qrSize + 40, 30, 2);
    ctx.textAlign = "left";
  }

  // Footer
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(M, H - 150);
  ctx.lineTo(W - M, H - 150);
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = font(24);
  drawWrapped(
    ctx,
    t("Made with LifeLink AI on {date}. This summary is not a prescription. Always check with a doctor.", { date: formatDate(new Date(), lang) }),
    M, H - 100, W - 2 * M, 34, 2
  );

  await savePdf(canvas, `Health-Summary-${safeFileName(profile.name)}.pdf`, "portrait");
}
