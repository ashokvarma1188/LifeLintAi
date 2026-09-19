import { useState, useRef, useEffect } from "react";
import { Bot, X, Send } from "lucide-react";
import { sendMessage } from "../services/assistant";
import { getErrorMessage } from "../services/api";
import "./AiAssistantWidget.css";

function AiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const submit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const reply = await sendMessage(text, history);
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
                Ask about first-aid steps or common over-the-counter medication. For emergencies, always use the SOS
                button.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-widget-msg ${m.role}`}>
                {m.content}
              </div>
            ))}
            {sending && <div className="ai-widget-msg assistant">Thinking…</div>}
          </div>

          <form className="ai-widget-form" onSubmit={submit}>
            <input
              placeholder="Describe what's going on…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()} aria-label="Send">
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
