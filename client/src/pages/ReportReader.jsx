import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ScanText, CloudUpload, FileText, X, Volume2, ShieldAlert, Sparkles, RotateCcw, Lock } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { explainReport } from "../services/aiHealth";
import { getErrorMessage } from "../services/api";
import { useLang } from "../i18n/context";
import { speechLangFor, LANGUAGES } from "../i18n/languages";
import "./Dashboard.css";
import "./portal.css";
import "./AiTools.css";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 8 * 1024 * 1024;
const STATUS_ORDER = { high: 0, low: 1, abnormal: 2, unknown: 3, normal: 4 };
const STATUS_LABEL = { high: "High", low: "Low", abnormal: "Abnormal", unknown: "Unclear", normal: "Normal" };

const formatSize = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

/** Upload a lab report (photo or PDF) and get it explained in plain words. */
function ReportReader() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  // Free the image preview, and stop reading aloud, when leaving the page.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const pick = (chosen) => {
    setError("");
    setResult(null);
    if (!chosen) return;
    if (!ACCEPTED.includes(chosen.type)) return setError("Only photos (JPG, PNG, WEBP) or PDF reports are allowed");
    if (chosen.size > MAX_BYTES) return setError("The report must be smaller than 8 MB");
    setFile(chosen);
    setPreview(chosen.type.startsWith("image/") ? URL.createObjectURL(chosen) : "");
  };

  const clear = () => {
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const explain = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await explainReport(file, lang));
    } catch (err) {
      setError(getErrorMessage(err, "The report could not be read right now. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const readAloud = () => {
    const synth = window.speechSynthesis;
    if (!synth || !result) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const text = [result.summary, ...result.advice].join(". ");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLangFor(lang);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  };

  const tests = result ? [...result.tests].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) : [];
  const counts = tests.reduce((acc, test) => ({ ...acc, [test.status]: (acc[test.status] || 0) + 1 }), {});
  const languageLabel = LANGUAGES.find((l) => l.code === lang)?.label || "English";

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content ai-page">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> {t("Back to dashboard")}
        </button>

        <div className="ai-hero">
          <div className="ai-hero-icon"><ScanText size={26} /></div>
          <div>
            <h1>{t("AI Report Reader")}</h1>
            <p>{t("Upload a blood test or lab report. The AI explains it in simple words and points out values that are high or low.")}</p>
          </div>
        </div>

        {!result && (
          <div className="portal-panel">
            <div
              className={`ai-drop${dragging ? " dragging" : ""}${file ? " has-file" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
              onClick={() => !file && inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !file && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} hidden onChange={(e) => pick(e.target.files?.[0])} />
              {!file ? (
                <>
                  <CloudUpload size={40} className="ai-drop-icon" />
                  <strong>{t("Drop your report here, or click to choose")}</strong>
                  <span>{t("Photo (JPG, PNG, WEBP) or PDF · up to 8 MB")}</span>
                </>
              ) : (
                <div className="ai-file">
                  {preview ? <img src={preview} alt="" className="ai-file-thumb" /> : <div className="ai-file-thumb pdf"><FileText size={30} /></div>}
                  <div className="ai-file-info">
                    <strong>{file.name}</strong>
                    <span>{formatSize(file.size)}</span>
                  </div>
                  <button type="button" className="portal-btn ghost small" onClick={(e) => { e.stopPropagation(); clear(); }} disabled={loading}>
                    <X size={14} /> {t("Remove")}
                  </button>
                </div>
              )}
            </div>

            <div className="ai-actions">
              <span className="ai-note"><Lock size={13} /> {t("Your report is not saved. It's only used to write this explanation.")}</span>
              <button className="portal-btn primary" onClick={explain} disabled={!file || loading}>
                <Sparkles size={16} /> {loading ? t("Reading your report…") : t("Explain my report")}
              </button>
            </div>
            <p className="ai-lang-note">{t("Explanation language: {language}", { language: languageLabel })}</p>

            {loading && (
              <div className="ai-thinking">
                <div className="ai-thinking-bar" />
                <span>{t("The AI is reading every value on your report. This takes about 10–20 seconds.")}</span>
              </div>
            )}
            {error && <div className="portal-message error" style={{ marginTop: 16, marginBottom: 0 }}>{t(error)}</div>}
          </div>
        )}

        {result && (
          <div className="ai-result">
            {!result.isMedicalReport && (
              <div className="portal-message error">{t("This doesn't look like a medical test report. Please upload a lab or blood test report.")}</div>
            )}

            {result.urgent && (
              <div className="ai-urgent">
                <ShieldAlert size={22} />
                <div>
                  <strong>{t("Some values may need a doctor today")}</strong>
                  {result.urgentReason && <p>{result.urgentReason}</p>}
                </div>
                <button className="portal-btn danger small" onClick={() => navigate("/find-hospitals")}>{t("Find a hospital")}</button>
              </div>
            )}

            <div className="portal-panel ai-summary">
              <div className="ai-summary-head">
                <div>
                  <span className="ai-eyebrow">{t("Summary")}</span>
                  <h2>{result.reportType || t("Your report")}</h2>
                </div>
                {"speechSynthesis" in window && result.summary && (
                  <button className={`portal-btn ghost small${speaking ? " active" : ""}`} onClick={readAloud}>
                    <Volume2 size={14} /> {speaking ? t("Stop") : t("Read aloud")}
                  </button>
                )}
              </div>
              <p className="ai-summary-text">{result.summary}</p>
              {tests.length > 0 && (
                <div className="ai-counts">
                  {["high", "low", "abnormal", "normal", "unknown"].filter((s) => counts[s]).map((status) => (
                    <span key={status} className={`ai-chip ${status}`}>{counts[status]} {t(STATUS_LABEL[status])}</span>
                  ))}
                </div>
              )}
            </div>

            {tests.length > 0 && (
              <div className="ai-tests">
                {tests.map((test, i) => (
                  <div key={`${test.name}-${i}`} className={`ai-test ${test.status}`}>
                    <div className="ai-test-top">
                      <strong>{test.name}</strong>
                      <span className={`ai-chip ${test.status}`}>{t(STATUS_LABEL[test.status])}</span>
                    </div>
                    <div className="ai-test-value">
                      {test.value} <span>{test.unit}</span>
                    </div>
                    {test.range && <div className="ai-test-range">{t("Normal range: {range}", { range: test.range })}</div>}
                    {test.meaning && <p>{test.meaning}</p>}
                  </div>
                ))}
              </div>
            )}

            {result.advice.length > 0 && (
              <div className="portal-panel">
                <span className="ai-eyebrow">{t("What you can do")}</span>
                <ul className="ai-list">
                  {result.advice.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}

            <p className="ai-disclaimer">{t("This explanation is made by AI and is not a diagnosis. Please show your report to a doctor.")}</p>
            <button className="portal-btn ghost" onClick={clear}>
              <RotateCcw size={15} /> {t("Read another report")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportReader;
