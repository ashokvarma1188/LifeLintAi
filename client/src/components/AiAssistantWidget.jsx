import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Image as ImageIcon } from "lucide-react";
import { sendMessage } from "../services/assistant";
import { getErrorMessage } from "../services/api";
import "./AiAssistantWidget.css";

const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

function AiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

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
            <button className="ai-widget-close" onClick={() => setOpen(false)} aria-label="Close">
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
            <input
              placeholder="Describe what's going on…"
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

      <button className="ai-widget-btn" onClick={() => setOpen((o) => !o)} aria-label="Open AI assistant">
        {open ? <X size={24} /> : <Bot size={26} />}
      </button>
    </>
  );
}

export default AiAssistantWidget;
