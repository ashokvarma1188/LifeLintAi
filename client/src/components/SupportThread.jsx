import { useState } from "react";
import { Send, X } from "lucide-react";
import { getUser } from "../services/auth";
import { useLang } from "../i18n/context";

/** Renders one support ticket's full thread, a reply box, and a close action. Shared by the civilian and admin views. */
function SupportThread({ ticket, onReply, onClose, onDone }) {
  const { t } = useLang();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const myId = getUser()?.id || getUser()?._id;

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      await onReply(ticket._id, message.trim());
      setMessage("");
    } catch (err) {
      setError(err.response?.data?.message || t("Could not send your reply."));
    } finally {
      setSending(false);
    }
  };

  const doClose = async () => {
    setClosing(true);
    setError("");
    try {
      await onClose(ticket._id);
    } catch (err) {
      setError(err.response?.data?.message || t("Could not close this ticket."));
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="portal-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
      <div className="portal-head" style={{ marginBottom: 10 }}>
        <div>
          <h2 style={{ margin: 0 }}>{ticket.subject}</h2>
          <p className="sub">
            {ticket.createdBy?.name ? `From ${ticket.createdBy.name} · ` : ""}
            <span className={`portal-badge ${ticket.status === "open" ? "pending" : "approved"}`}>{ticket.status}</span>
          </p>
        </div>
        <button className="portal-back" style={{ margin: 0 }} onClick={onDone}>
          <X size={14} /> {t("Close")}
        </button>
      </div>

      {error && <div className="portal-message error">{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto", marginBottom: 12 }}>
        {(ticket.messages || []).map((m, i) => {
          const mine = String(m.senderId?._id || m.senderId) === String(myId);
          return (
            <div
              key={i}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                background: mine ? "var(--accent-color, #0f9d63)" : "var(--bg-surface-2, rgba(255,255,255,0.06))",
                color: mine ? "#fff" : "inherit",
                borderRadius: 10,
                padding: "8px 12px",
                maxWidth: "80%",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2 }}>
                {m.senderRole === "admin" ? t("Support") : m.senderId?.name || t("You")}
              </div>
              <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          );
        })}
      </div>

      {ticket.status === "closed" && (
        <div className="portal-message success">{t("This ticket is closed. Sending a reply will reopen it.")}</div>
      )}
      <form className="portal-form" onSubmit={send}>
        <div className="portal-field">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("Write a reply…")}
            rows={2}
          />
        </div>
        <div className="portal-form-actions">
          {ticket.status === "open" && (
            <button type="button" className="portal-btn ghost" onClick={doClose} disabled={closing}>
              {closing ? t("Closing…") : t("Close ticket")}
            </button>
          )}
          <button type="submit" className="portal-btn primary" disabled={sending}>
            <Send size={14} /> {sending ? t("Sending…") : t("Send")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SupportThread;
