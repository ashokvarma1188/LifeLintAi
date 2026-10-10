import { useCallback, useEffect, useRef, useState } from "react";
import { X, Send, Camera, Mic, Square, MessageCircle } from "lucide-react";
import { listMessages, sendText, sendMedia, fetchMessageFile } from "../services/sosChat";
import { getErrorMessage } from "../services/api";
import { useLang } from "../i18n/context";
import "./SosChat.css";

const POLL_MS = 5000;
const MAX_VOICE_SECONDS = 60;
const ROLE_LABEL = { civilian: "Civilian", hospital: "Hospital", police: "Police", firestation: "Fire Station" };

const recorderSupported = () => typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;

/** Loads a protected photo / voice note once and shows it. */
function MediaBubble({ message }) {
  const { t } = useLang();
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    fetchMessageFile(message._id)
      .then((u) => {
        objectUrl = u;
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [message._id]);

  if (failed) return <span className="sos-chat-media-error">{t("Couldn't load this file.")}</span>;
  if (!url) return <span className="sos-chat-media-loading">{t("Loading…")}</span>;
  if (message.kind === "photo") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={t("Photo from the scene")} className="sos-chat-photo" />
      </a>
    );
  }
  return <audio controls src={url} className="sos-chat-audio" />;
}

/**
 * Chat thread for one SOS — the civilian and the responders exchange messages,
 * scene photos and short voice notes. Opens as a modal from either side.
 */
function SosChat({ requestId, title, onClose }) {
  const { t } = useLang();
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await listMessages(requestId);
      setMessages(data.messages);
      setOpen(data.open);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load messages."));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    (async () => {
      await load();
    })();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Keep the newest message in view when something new arrives.
  useEffect(() => {
    if (messages.length !== lastCount.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    lastCount.current = messages.length;
  }, [messages]);

  // Stop the microphone if the chat closes mid-recording.
  useEffect(
    () => () => {
      clearInterval(timerRef.current);
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      recorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    },
    []
  );

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not send. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const submitText = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    run(async () => {
      await sendText(requestId, value);
      setText("");
    });
  };

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Only JPG, PNG or WEBP photos are allowed.");
    if (file.size > 5 * 1024 * 1024) return setError("File must be smaller than 5 MB");
    run(() => sendMedia(requestId, "photo", file, file.name));
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const type = (recorder.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunks, { type });
        if (blob.size > 0) run(() => sendMedia(requestId, "voice", blob, `voice-note.${type.split("/")[1] || "webm"}`));
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_VOICE_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone access was blocked. Allow it in your browser's address bar to record a voice note.");
    }
  };

  return (
    <div className="sos-chat-backdrop" onClick={onClose}>
      <div className="sos-chat" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t("SOS chat")}>
        <div className="sos-chat-head">
          <div>
            <h3>
              <MessageCircle size={16} /> {title || t("SOS chat")}
            </h3>
            <p>{open ? t("Messages, photos and voice notes go to everyone handling this alert.") : t("This alert is closed — the chat is read-only.")}</p>
          </div>
          <button className="sos-chat-close" onClick={onClose} aria-label={t("Close")}>
            <X size={18} />
          </button>
        </div>

        <div className="sos-chat-list" ref={listRef}>
          {loading && <div className="sos-chat-empty">{t("Loading…")}</div>}
          {!loading && messages.length === 0 && (
            <div className="sos-chat-empty">{t("No messages yet. Describe what's happening, or send a photo or voice note.")}</div>
          )}
          {messages.map((m) => (
            <div key={m._id} className={`sos-chat-msg ${m.mine ? "mine" : "theirs"}`}>
              <div className="sos-chat-meta">
                {m.mine ? t("You") : `${m.senderName || t("Responder")} · ${t(ROLE_LABEL[m.senderRole] || "Responder")}`} ·{" "}
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              {m.kind !== "text" && <MediaBubble message={m} />}
              {m.text && <div className="sos-chat-text">{m.text}</div>}
            </div>
          ))}
        </div>

        {error && <div className="sos-chat-error">{t(error)}</div>}

        {open && (
          <form className="sos-chat-form" onSubmit={submitText}>
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" ref={fileRef} onChange={pickPhoto} hidden />
            <button type="button" className="sos-chat-icon" onClick={() => fileRef.current?.click()} disabled={busy || recording} title={t("Send a photo")} aria-label={t("Send a photo")}>
              <Camera size={17} />
            </button>
            {recorderSupported() && (
              <button
                type="button"
                className={`sos-chat-icon${recording ? " recording" : ""}`}
                onClick={recording ? stopRecording : startRecording}
                disabled={busy}
                title={recording ? t("Stop and send") : t("Record a voice note")}
                aria-label={recording ? t("Stop and send") : t("Record a voice note")}
              >
                {recording ? <Square size={15} /> : <Mic size={17} />}
              </button>
            )}
            {recording ? (
              <span className="sos-chat-recording">{t("Recording… {s}s — tap stop to send", { s: seconds })}</span>
            ) : (
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("Type a message…")}
                maxLength={1000}
                disabled={busy}
              />
            )}
            <button type="submit" className="sos-chat-send" disabled={busy || recording || !text.trim()} aria-label={t("Send")}>
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default SosChat;
