import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Siren } from "lucide-react";
import { useLang } from "../i18n/context";
import { speechLangFor } from "../i18n/languages";
import "./VoiceSos.css";

const SpeechRecognitionApi =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

const COUNTDOWN_SECONDS = 5;

const LANGUAGES = [
  { code: "en-IN", label: "English", hint: "Say “Help” or “Emergency”" },
  { code: "hi-IN", label: "हिन्दी", hint: "बोलें “मदद” या “बचाओ”" },
  { code: "te-IN", label: "తెలుగు", hint: "“సహాయం” లేదా “కాపాడండి” అనండి" },
];

// Any of these (in any language, plus common romanised spellings) starts the countdown.
const TRIGGER_WORDS = [
  "help", "emergency", "sos", "ambulance", "accident", "fire", "save me", "police",
  "मदद", "बचाओ", "आपातकाल", "एम्बुलेंस", "एंबुलेंस", "आग", "दुर्घटना", "पुलिस",
  "సహాయం", "కాపాడండి", "ప్రమాదం", "అగ్ని", "అంబులెన్స్", "పోలీస్",
  "madad", "bachao", "sahayam", "kapadandi", "aag", "pramadam",
];

// Words that also tell us what kind of emergency it is.
const FIRE_WORDS = ["fire", "आग", "अग्नि", "అగ్ని", "aag"];
const ACCIDENT_WORDS = ["accident", "दुर्घटना", "ప్రమాదం", "pramadam"];

const VOICE_ERRORS = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser's address bar to use Voice SOS.",
  "service-not-allowed": "Microphone access was blocked. Allow it in your browser's address bar to use Voice SOS.",
  "no-speech": "Didn't hear anything. Tap the mic and say “Help” right away.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice needs an internet connection.",
};

function interpret(transcript) {
  const text = transcript.toLowerCase();
  if (!TRIGGER_WORDS.some((w) => text.includes(w))) return null;
  if (FIRE_WORDS.some((w) => text.includes(w))) return "fire";
  if (ACCIDENT_WORDS.some((w) => text.includes(w))) return "accident";
  return "";
}

/**
 * Hands-free SOS: tap the mic, say "help", and a 5-second cancellable countdown
 * starts. `onTrigger(type)` fires when it reaches zero (type is "fire" /
 * "accident" if the user said so, otherwise "").
 */
function VoiceSos({ onTrigger, disabled }) {
  const { t, lang: appLang } = useLang();
  // Follows the app language until the user picks a different voice language here.
  const [voiceLang, setVoiceLang] = useState(null);
  const lang = voiceLang || speechLangFor(appLang);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState("");
  const [count, setCount] = useState(null);
  const [detectedType, setDetectedType] = useState("");
  const recognitionRef = useRef(null);
  const matchedRef = useRef(false);
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  });

  const stopListening = useCallback(() => recognitionRef.current?.stop(), []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  // Tick the countdown down once a second; fire the SOS when it reaches zero.
  useEffect(() => {
    if (count === null) return undefined;
    navigator.vibrate?.(80);
    const timer = setTimeout(() => {
      if (count <= 1) {
        setCount(null);
        onTriggerRef.current(detectedType);
      } else {
        setCount(count - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [count, detectedType]);

  const startListening = () => {
    if (listening) {
      stopListening();
      return;
    }
    setError("");
    setHeard("");
    matchedRef.current = false;

    const recognition = new SpeechRecognitionApi();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let spoken = "";
      for (let i = 0; i < event.results.length; i++) spoken += event.results[i][0].transcript;
      setHeard(spoken);
      if (matchedRef.current) return;
      const type = interpret(spoken);
      if (type !== null) {
        matchedRef.current = true;
        setDetectedType(type);
        setCount(COUNTDOWN_SECONDS);
        recognition.stop();
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") setError(t(VOICE_ERRORS[event.error] || "Voice input stopped unexpectedly."));
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (!matchedRef.current) setError((prev) => prev || t("Didn't hear “help”. Tap the mic and try again, or press the SOS button."));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError(t("Voice input couldn't start. Please try again."));
    }
  };

  const cancel = () => setCount(null);
  const sendNow = () => {
    setCount(null);
    onTriggerRef.current(detectedType);
  };

  if (!SpeechRecognitionApi) return null;

  const hint = LANGUAGES.find((l) => l.code === lang)?.hint;

  return (
    <>
      <div className="voice-sos">
        <button
          type="button"
          className={`voice-sos-btn${listening ? " listening" : ""}`}
          onClick={startListening}
          disabled={disabled || count !== null}
          aria-label={listening ? t("Stop listening") : t("Start Voice SOS")}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
          {listening ? t("Listening…") : t("Voice SOS")}
        </button>
        <select
          className="voice-sos-lang"
          value={lang}
          onChange={(e) => setVoiceLang(e.target.value)}
          disabled={listening || count !== null}
          aria-label={t("Voice language")}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <span className="voice-sos-hint">{listening && heard ? t("Heard: “{text}”", { text: heard }) : hint}</span>
      </div>
      {error && <div className="voice-sos-error">{error}</div>}

      {count !== null && (
        <div className="voice-sos-backdrop" role="alertdialog" aria-live="assertive" aria-label={t("Sending SOS")}>
          <div className="voice-sos-modal">
            <Siren size={28} />
            <h3>{t("Sending SOS in")}</h3>
            <div className="voice-sos-count" key={count}>{count}</div>
            {heard && <p className="voice-sos-heard">{t("I heard: “{text}”", { text: heard })}</p>}
            <p>{t("Your live location will be shared with the selected services.")}</p>
            <div className="voice-sos-actions">
              <button type="button" className="voice-sos-cancel" onClick={cancel}>{t("Cancel")}</button>
              <button type="button" className="voice-sos-now" onClick={sendNow}>{t("Send now")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VoiceSos;
