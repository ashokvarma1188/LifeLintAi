import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Stethoscope, Mic, MicOff, Siren, Phone, TriangleAlert, CircleCheck, Hospital, RotateCcw, BedDouble } from "lucide-react";
import AppNavbar from "./AppNavbar";
import MapsLink from "../components/MapsLink";
import api, { getErrorMessage } from "../services/api";
import { checkSymptoms } from "../services/aiHealth";
import { distanceKm } from "../utils/maps";
import { useLang } from "../i18n/context";
import { speechLangFor } from "../i18n/languages";
import "./Dashboard.css";
import "./portal.css";
import "./AiTools.css";

const SpeechRecognitionApi = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

const QUICK_SYMPTOMS = ["Fever", "Headache", "Cough", "Chest pain", "Trouble breathing", "Vomiting", "Stomach pain", "Dizziness", "Rash", "Bleeding"];
const AGE_GROUPS = [
  { value: "adult", label: "Adult" },
  { value: "child", label: "Child" },
  { value: "senior", label: "Elderly" },
  { value: "pregnant", label: "Pregnant" },
];
const LEVELS = {
  emergency: { icon: Siren, label: "Emergency", tag: "Call 112 now" },
  doctor: { icon: TriangleAlert, label: "See a doctor", tag: "See a doctor today" },
  home: { icon: CircleCheck, label: "Home care", tag: "Safe to care for at home" },
};

/** Describe symptoms and the AI sorts them: call 112 now, see a doctor today, or home care. */
function SymptomChecker() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [symptoms, setSymptoms] = useState("");
  const [ageGroup, setAgeGroup] = useState("adult");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [listening, setListening] = useState(false);
  const [hospitals, setHospitals] = useState(null);
  const [hospitalNote, setHospitalNote] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const addSymptom = (label) => {
    const word = t(label);
    setSymptoms((text) => (text.trim() ? `${text.trim().replace(/[,.]$/, "")}, ${word.toLowerCase()}` : word));
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognitionApi();
    recognition.lang = speechLangFor(lang);
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const said = Array.from(event.results).map((r) => r[0].transcript).join(" ");
      setSymptoms((text) => (text.trim() ? `${text.trim()} ${said}` : said));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  // Nearest hospitals with free beds (ICU first for an emergency).
  const loadHospitals = (level) => {
    if (!navigator.geolocation) return setHospitalNote("Location is not supported on this device/browser.");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { data } = await api.get("/hospitals/nearby", { params: { latitude: coords.latitude, longitude: coords.longitude } });
          const ranked = data
            .map((h) => ({ ...h, km: distanceKm(coords.latitude, coords.longitude, h.location.coordinates[1], h.location.coordinates[0]) }))
            .sort((a, b) => {
              const free = (h) => (level === "emergency" ? (h.icuAvailableBeds > 0 ? 2 : 0) + (h.availableBeds > 0 ? 1 : 0) : h.availableBeds > 0 ? 1 : 0);
              return free(b) - free(a) || a.km - b.km;
            })
            .slice(0, 3);
          setHospitals(ranked);
        } catch {
          setHospitalNote("Could not load nearby hospitals.");
        }
      },
      () => setHospitalNote("Allow location to see the nearest hospitals.")
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (symptoms.trim().length < 3) return setError("Please describe the symptoms.");
    setLoading(true);
    setError("");
    setResult(null);
    setHospitals(null);
    setHospitalNote("");
    try {
      const data = await checkSymptoms({ symptoms, ageGroup, language: lang });
      setResult(data);
      loadHospitals(data.level);
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setSymptoms("");
    setHospitals(null);
  };

  const level = result ? LEVELS[result.level] : null;
  // Fixed fallback text is English and gets translated; AI text is already in the chosen language.
  const show = (text) => (result?.aiUsed ? text : t(text));

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content ai-page">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> {t("Back to dashboard")}
        </button>

        <div className="ai-hero">
          <div className="ai-hero-icon"><Stethoscope size={26} /></div>
          <div>
            <h1>{t("AI Symptom Checker")}</h1>
            <p>{t("Describe how you feel. The AI tells you how urgent it is and shows the nearest hospital.")}</p>
          </div>
        </div>

        {!result && (
          <form className="portal-panel" onSubmit={submit}>
            <div className="portal-field">
              <label htmlFor="symptoms">{t("What symptoms do you have?")}</label>
              <div className="ai-textarea-wrap">
                <textarea
                  id="symptoms"
                  rows={4}
                  value={symptoms}
                  maxLength={1000}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder={t("For example: fever since 2 days, headache and body pain")}
                />
                {SpeechRecognitionApi && (
                  <button type="button" className={`ai-mic${listening ? " on" : ""}`} onClick={toggleVoice} title={t("Speak your symptoms")}>
                    {listening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                )}
              </div>
            </div>

            <div className="ai-quick">
              {QUICK_SYMPTOMS.map((label) => (
                <button type="button" key={label} className="ai-quick-chip" onClick={() => addSymptom(label)}>+ {t(label)}</button>
              ))}
            </div>

            <div className="portal-field" style={{ marginTop: 18 }}>
              <label>{t("Who is it for?")}</label>
              <div className="ai-segment">
                {AGE_GROUPS.map((group) => (
                  <button type="button" key={group.value} className={ageGroup === group.value ? "on" : ""} onClick={() => setAgeGroup(group.value)}>
                    {t(group.label)}
                  </button>
                ))}
              </div>
            </div>

            <div className="ai-actions">
              <span className="ai-note"><Siren size={13} /> {t("If someone is unconscious, not breathing or bleeding heavily, call 112 now.")}</span>
              <button className="portal-btn primary" type="submit" disabled={loading}>
                <Stethoscope size={16} /> {loading ? t("Checking…") : t("Check symptoms")}
              </button>
            </div>
            {loading && (
              <div className="ai-thinking">
                <div className="ai-thinking-bar" />
                <span>{t("The AI is checking your symptoms…")}</span>
              </div>
            )}
            {error && <div className="portal-message error" style={{ marginTop: 16, marginBottom: 0 }}>{t(error)}</div>}
          </form>
        )}

        {result && level && (
          <div className="ai-result">
            <div className={`triage-card ${result.level}`}>
              <div className="triage-badge">
                <level.icon size={30} />
                <span>{t(level.label)}</span>
              </div>
              <div className="triage-body">
                <span className="triage-tag">{t(level.tag)}</span>
                <h2>{show(result.headline)}</h2>
                {result.reason && <p>{show(result.reason)}</p>}
                {result.careType && <span className="triage-care">{t("Kind of care: {care}", { care: show(result.careType) })}</span>}
              </div>
              {result.level === "emergency" && (
                <div className="triage-cta">
                  <a className="portal-btn danger" href="tel:112"><Phone size={16} /> {t("Call 112")}</a>
                  <button className="portal-btn ghost" onClick={() => navigate("/dashboard")}><Siren size={16} /> {t("Send SOS")}</button>
                </div>
              )}
            </div>

            <div className="ai-two-col">
              {result.doNow.length > 0 && (
                <div className="portal-panel">
                  <span className="ai-eyebrow">{t("What to do now")}</span>
                  <ol className="ai-list numbered">
                    {result.doNow.map((item) => <li key={item}>{show(item)}</li>)}
                  </ol>
                </div>
              )}
              {result.warningSigns.length > 0 && (
                <div className="portal-panel ai-warning-panel">
                  <span className="ai-eyebrow danger">{t("Go to a hospital straight away if")}</span>
                  <ul className="ai-list warn">
                    {result.warningSigns.map((item) => <li key={item}>{show(item)}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="portal-panel">
              <span className="ai-eyebrow">{result.level === "home" ? t("If it gets worse, the nearest hospitals") : t("Nearest hospitals")}</span>
              {!hospitals && !hospitalNote && <p className="ai-muted">{t("Finding hospitals near you…")}</p>}
              {hospitalNote && <p className="ai-muted">{t(hospitalNote)}</p>}
              {hospitals?.length === 0 && <p className="ai-muted">{t("No hospitals found near you yet.")}</p>}
              <div className="ai-hospitals">
                {hospitals?.map((h) => (
                  <div key={h._id} className="ai-hospital">
                    <div className="ai-hospital-icon"><Hospital size={18} /></div>
                    <div className="ai-hospital-info">
                      <strong>{h.name}</strong>
                      <span>
                        {t("{km} km away", { km: h.km.toFixed(1) })} · <BedDouble size={12} /> {t("{count} beds free", { count: h.availableBeds || 0 })}
                        {h.icuAvailableBeds > 0 && ` · ${t("{count} ICU free", { count: h.icuAvailableBeds })}`}
                      </span>
                    </div>
                    <div className="ai-hospital-actions">
                      {h.phone && <a className="portal-btn ghost small" href={`tel:${h.phone}`}><Phone size={13} /> {t("Call")}</a>}
                      <MapsLink coordinates={h.location.coordinates} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="ai-disclaimer">{t("This is guidance from AI, not a diagnosis. When in doubt, see a doctor or call 112.")}</p>
            <button className="portal-btn ghost" onClick={reset}>
              <RotateCcw size={15} /> {t("Check other symptoms")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SymptomChecker;
