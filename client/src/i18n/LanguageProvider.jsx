import { useCallback, useEffect, useMemo, useState } from "react";
import { LanguageContext } from "./context";
import { LANGUAGES, DEFAULT_LANG, NO_ENTRIES, loadDictionary, format, ensureScriptFont } from "./languages";

const STORAGE_KEY = "lang";

const readSaved = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((l) => l.code === saved) ? saved : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readSaved);
  const [dictionary, setDictionary] = useState(() => ({ code: DEFAULT_LANG, entries: NO_ENTRIES }));

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* private mode — the choice just won't be remembered */
    }
    ensureScriptFont(lang);

    let cancelled = false;
    loadDictionary(lang)
      .then((entries) => {
        // English has no dictionary — keep the same object so nothing re-renders for nothing.
        if (!cancelled) setDictionary((prev) => (prev.code === lang && prev.entries === entries ? prev : { code: lang, entries }));
      })
      .catch(() => {
        if (!cancelled) setDictionary({ code: lang, entries: NO_ENTRIES });
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const setLang = useCallback((code) => {
    if (LANGUAGES.some((l) => l.code === code)) setLangState(code);
  }, []);

  const value = useMemo(() => {
    const entries = dictionary.code === lang ? dictionary.entries : NO_ENTRIES;
    return {
      lang,
      setLang,
      t: (text, vars) => format(entries[text] || text, vars),
    };
  }, [lang, dictionary, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export default LanguageProvider;
