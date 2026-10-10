import { Languages } from "lucide-react";
import { useLang } from "../i18n/context";
import { LANGUAGES } from "../i18n/languages";
import "./LanguageSwitcher.css";

/** Compact English / हिन्दी / తెలుగు picker used in every header. `variant="landing"` matches the dark glass navbar. */
function LanguageSwitcher({ variant = "app" }) {
  const { lang, setLang } = useLang();

  return (
    <label className={`lang-switch lang-switch-${variant}`} title="Language / भाषा / భాష">
      <Languages size={15} aria-hidden="true" />
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSwitcher;
