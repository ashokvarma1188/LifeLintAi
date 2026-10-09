import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Image as ImageIcon, Mic, MicOff } from "lucide-react";
import { sendMessage } from "../services/assistant";
import { getErrorMessage } from "../services/api";
import "./AiAssistantWidget.css";

const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

/* The browser's built-in speech-to-text (Chrome/Edge/Android Chrome). Absent elsewhere, in which case the mic is simply not shown. */
const SpeechRecognitionApi =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

const VOICE_LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "te-IN", label: "తెలుగు" },
];

const VOICE_ERRORS = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser's address bar to use voice.",
  "service-not-allowed": "Microphone access was blocked. Allow it in your browser's address bar to use voice.",
  "no-speech": "Didn't hear anything. Check your microphone isn't muted, then tap the mic and start speaking right away.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice needs an internet connection.",
};

function AiAssistantWidget({ open, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState("en-IN");
  const [voiceError, setVoiceError] = useState("");
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  // Don't keep the microphone open once the panel is closed or the page is left.
  useEffect(() => {
    if (!open) recognitionRef.current?.stop();
  }, [open]);
  useEffect(() => () => recognitionRef.current?.abort(), []);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    setVoiceError("");
    const recognition = new SpeechRecognitionApi();
    recognition.lang = voiceLang;
    recognition.interimResults = true;
    recognition.continuous = false;

    // Spoken words are appended to whatever was already typed, and shown live as they're recognised.
    const typedBefore = input.trim();
    recognition.onresult = (event) => {
      let spoken = "";
      for (let i = 0; i < event.results.length; i++) spoken += event.results[i][0].transcript;
      setInput(typedBefore ? `${typedBefore} ${spoken}` : spoken);
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") setVoiceError(VOICE_ERRORS[event.error] || "Voice input stopped unexpectedly.");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setVoiceError("Voice input couldn't start. Please try again.");
    }
  };

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Only JPG, PNG or WEBP photos are allowed.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo must be smaller than 6 MB.");
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if ((!text && !photo) || sending) return;
    recognitionRef.current?.stop();

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text, image: photoPreview }]);
    setInput("");
    const sentPhoto = photo;
    clearPhoto();
    setSending(true);

    try {
      const reply = await sendMessage(text, history, sentPhoto);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "error", content: getErrorMessage(err, "The assistant could not respond. Please try again.") },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="ai-widget-panel">
          <div className="ai-widget-header">
            <div>
              <h4>AI First-Aid Assistant</h4>
              <p>Quick guidance while help is on the way</p>
            </div>
            <button className="ai-widget-close" onClick={onToggle} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="ai-widget-messages" ref={listRef}>
            {messages.length === 0 && (
              <div className="ai-widget-empty">
                Ask about first-aid steps, common over-the-counter medication, or attach a photo of an injury for
                guidance. For emergencies, always use the SOS button.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-widget-msg ${m.role}`}>
                {m.image && <img src={m.image} alt="Attached injury" className="ai-widget-msg-img" />}
                {m.content}
              </div>
            ))}
            {sending && <div className="ai-widget-msg assistant">Thinking…</div>}
          </div>

          {photoError && <div className="ai-widget-photo-error">{photoError}</div>}
          {photoPreview && (
            <div className="ai-widget-photo-preview">
              <img src={photoPreview} alt="Selected" />
              <span>Photo attached</span>
              <button type="button" onClick={clearPhoto} aria-label="Remove photo">
                <X size={14} />
              </button>
            </div>
          )}

          {voiceError && <div className="ai-widget-photo-error">{voiceError}</div>}
          {SpeechRecognitionApi && (
            <div className="ai-widget-voice-row">
              <select
                className="ai-widget-lang"
                value={voiceLang}
                onChange={(e) => setVoiceLang(e.target.value)}
                disabled={listening}
                aria-label="Voice language"
              >
                {VOICE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <span className={`ai-widget-voice-status${listening ? " active" : ""}`}>
                {listening ? "Listening… speak now" : "Tap the mic to speak instead of typing"}
              </span>
            </div>
          )}

          <form className="ai-widget-form" onSubmit={submit}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={fileInputRef}
              onChange={pickPhoto}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="ai-widget-attach"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              aria-label="Attach a photo"
              title="Attach a photo of an injury"
            >
              <ImageIcon size={16} />
            </button>
            {SpeechRecognitionApi && (
              <button
                type="button"
                className={`ai-widget-mic${listening ? " listening" : ""}`}
                onClick={toggleVoice}
                disabled={sending}
                aria-label={listening ? "Stop voice input" : "Speak your question"}
                title={listening ? "Stop listening" : "Speak instead of typing"}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <input
              placeholder={listening ? "Listening…" : "Describe what's going on…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button type="submit" disabled={sending || (!input.trim() && !photo)} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
          <div className="ai-widget-disclaimer">Not a substitute for professional medical advice.</div>
        </div>
      )}

      <button className="ai-widget-btn" onClick={onToggle} aria-label="Open AI assistant">
        {open ? <X size={24} /> : <Bot size={26} />}
      </button>
    </>
  );
}

export default AiAssistantWidget;
