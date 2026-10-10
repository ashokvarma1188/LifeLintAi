import { format } from "../i18n/languages";

/** Digits only; a bare 10-digit Indian mobile gets the +91 country code that wa.me needs. */
export function toInternationalPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export const trackUrl = (token) => `${window.location.origin}/track/${token}`;

const SOS_TYPE_TEXT = {
  medical: "medical emergency",
  fire: "fire emergency",
  accident: "accident",
  safety: "safety emergency",
  other: "emergency",
};

/** The text sent to family. `t` (from useLang) writes it in the sender's chosen language. */
export function sosMessage(name, type, token, t = format) {
  return t("🚨 {name} has sent a LifeLink SOS ({what}). Follow live location and help status here: {url}", {
    name: name || t("Someone close to you"),
    what: t(SOS_TYPE_TEXT[type] || "emergency"),
    url: trackUrl(token),
  });
}

export const whatsappLink = (phone, text) => `https://wa.me/${toInternationalPhone(phone)}?text=${encodeURIComponent(text)}`;
export const smsLink = (phone, text) => `sms:${String(phone || "").replace(/[^\d+]/g, "")}?body=${encodeURIComponent(text)}`;

export const walkUrl = (token) => `${window.location.origin}/walk-track/${token}`;

/** "Walk with me" message for family — they follow along on the public walk page. */
export function walkMessage(name, destination, token, t = format) {
  return t("🚶 {name} is walking{to} with LifeLink and shared their live location. Follow along here: {url}", {
    name: name || t("Someone close to you"),
    to: destination ? t(" to {place}", { place: destination }) : "",
    url: walkUrl(token),
  });
}
