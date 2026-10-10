/*
 * App languages. English text is the translation key: t("Find Hospitals") looks the
 * sentence up in the Hindi/Telugu dictionary and falls back to the English itself, so a
 * missing translation never shows a blank or a key name. Dictionaries are separate
 * chunks, only downloaded when someone picks that language.
 */
export const LANGUAGES = [
  { code: "en", label: "English", short: "EN", speech: "en-IN" },
  { code: "hi", label: "हिन्दी", short: "हिं", speech: "hi-IN" },
  { code: "te", label: "తెలుగు", short: "తె", speech: "te-IN" },
];

export const DEFAULT_LANG = "en";

export const speechLangFor = (code) => LANGUAGES.find((l) => l.code === code)?.speech || "en-IN";

const LOADERS = {
  hi: () => import("./hi.js"),
  te: () => import("./te.js"),
};

export const NO_ENTRIES = Object.freeze({});

export const loadDictionary = (code) => (LOADERS[code] ? LOADERS[code]().then((m) => m.default) : Promise.resolve(NO_ENTRIES));

/** Replaces {name}-style placeholders. */
export function format(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => (vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : match));
}

/** Noto fonts for Devanagari/Telugu, fetched only when one of those languages is in use. */
const FONT_URLS = {
  hi: "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap",
  te: "https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap",
};

export function ensureScriptFont(code) {
  const href = FONT_URLS[code];
  if (!href || document.querySelector(`link[data-lang-font="${code}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.langFont = code;
  document.head.appendChild(link);
}
