import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, MessageCircle } from "lucide-react";
import AppNavbar from "./AppNavbar";
import SupportThread from "../components/SupportThread";
import { SkeletonRows } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { createTicket, myTickets, getTicket, replyToTicket, closeTicket } from "../services/support";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";
import { useLang } from "../i18n/context";

function Support() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [openTicket, setOpenTicket] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setTickets(await myTickets());
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your tickets."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const submitTicket = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return setError(t("Fill in both fields."));
    setSubmitting(true);
    setError("");
    try {
      await createTicket(form.subject.trim(), form.message.trim());
      await load();
      setForm({ subject: "", message: "" });
      setCreating(false);
    } catch (err) {
      setError(getErrorMessage(err, t("Could not submit your ticket.")));
    } finally {
      setSubmitting(false);
    }
  };

  const openThread = async (id) => {
    try {
      setOpenTicket(await getTicket(id));
    } catch (err) {
      setError(getErrorMessage(err, t("Could not open this ticket.")));
    }
  };

  const handleReply = async (id, message) => {
    const updated = await replyToTicket(id, message);
    setOpenTicket(updated);
    await load();
  };

  const handleClose = async (id) => {
    await closeTicket(id);
    await openThread(id);
    await load();
  };

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> {t("Back to dashboard")}
        </button>

        <div className="portal-head">
          <div>
            <h1>{t("Support")}</h1>
            <p>{t("Raise a ticket and the admin team will reply here.")}</p>
          </div>
          <button className="portal-btn primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> {t("New ticket")}
          </button>
        </div>

        {error && <div className="portal-message error">{t(error)}</div>}

        <div className="portal-panel">
          {loading ? (
            <SkeletonRows rows={3} cols={4} />
          ) : tickets.length === 0 ? (
            <EmptyState icon={MessageCircle} title={t("You haven't raised any support tickets yet.")} hint={t("Tap “New ticket” above if you need help from the admin team.")} />
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr><th>{t("Subject")}</th><th>{t("Status")}</th><th>{t("Last message")}</th><th>{t("Updated")}</th><th /></tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket._id}>
                      <td>{ticket.subject}</td>
                      <td><span className={`portal-badge ${ticket.status === "open" ? "pending" : "approved"}`}>{t(ticket.status)}</span></td>
                      <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ticket.lastMessage ? `${ticket.lastMessage.senderRole === "admin" ? `${t("Support")}: ` : ""}${ticket.lastMessage.text}` : "—"}
                      </td>
                      <td>{new Date(ticket.updatedAt).toLocaleString()}</td>
                      <td>
                        <button className="portal-btn ghost small" onClick={() => openThread(ticket._id)}>
                          <MessageCircle size={14} /> {t("Open")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {creating && (
        <div className="portal-modal-backdrop" onClick={() => setCreating(false)}>
          <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("New support ticket")}</h2>
            <form className="portal-form" onSubmit={submitTicket}>
              <div className="portal-field">
                <label htmlFor="subject">{t("Subject")}</label>
                <input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder={t("e.g. Can't verify my email")}
                />
              </div>
              <div className="portal-field">
                <label htmlFor="message">{t("Message")}</label>
                <textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t("Describe the issue…")}
                />
              </div>
              <div className="portal-form-actions">
                <button type="button" className="portal-btn ghost" onClick={() => setCreating(false)} disabled={submitting}>
                  {t("Cancel")}
                </button>
                <button type="submit" className="portal-btn primary" disabled={submitting}>
                  {submitting ? t("Submitting…") : t("Submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {openTicket && (
        <div className="portal-modal-backdrop" onClick={() => setOpenTicket(null)}>
          <SupportThread
            ticket={openTicket}
            onReply={handleReply}
            onClose={handleClose}
            onDone={() => setOpenTicket(null)}
          />
        </div>
      )}
    </div>
  );
}

export default Support;
