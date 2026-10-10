import { createContext, useContext } from "react";
import { DEFAULT_LANG, format } from "./languages";

export const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (text, vars) => format(text, vars),
});

/** `t(englishText, vars)` translates into the chosen language; `lang` is "en" | "hi" | "te". */
export const useLang = () => useContext(LanguageContext);
