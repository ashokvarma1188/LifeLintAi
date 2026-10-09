/** Digits only; a bare 10-digit Indian mobile gets the +91 country code that wa.me needs. */
export function toInternationalPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export const trackUrl = (token) => `${window.location.origin}/track/${token}`;

export function sosMessage(name, type, token) {
  const what = type && type !== "other" ? `${type} emergency` : "emergency";
  return `🚨 ${name || "Someone close to you"} has sent a LifeLink SOS (${what}). Follow live location and help status here: ${trackUrl(token)}`;
}

export const whatsappLink = (phone, text) => `https://wa.me/${toInternationalPhone(phone)}?text=${encodeURIComponent(text)}`;
export const smsLink = (phone, text) => `sms:${String(phone || "").replace(/[^\d+]/g, "")}?body=${encodeURIComponent(text)}`;
