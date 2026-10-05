import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, MessageCircle } from "lucide-react";
import AppNavbar from "./AppNavbar";
import SupportThread from "../components/SupportThread";
import { createTicket, myTickets, getTicket, replyToTicket, closeTicket } from "../services/support";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

function Support() {
  const navigate = useNavigate();
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
    if (!form.subject.trim() || !form.message.trim()) return setError("Fill in both fields.");
    setSubmitting(true);
    setError("");
    try {
      await createTicket(form.subject.trim(), form.message.trim());
      setForm({ subject: "", message: "" });
      setCreating(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit your ticket."));
    } finally {
      setSubmitting(false);
    }
  };

  const openThread = async (id) => {
    try {
      setOpenTicket(await getTicket(id));
    } catch (err) {
      setError(getErrorMessage(err, "Could not open this ticket."));
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
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        <div className="portal-head">
          <div>
            <h1>Support</h1>
            <p>Raise a ticket and the admin team will reply here.</p>
          </div>
          <button className="portal-btn primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> New ticket
          </button>
        </div>

        {error && <div className="portal-message error">{error}</div>}

        <div className="portal-panel">
          {loading ? (
            <div className="portal-empty">Loading your tickets…</div>
          ) : tickets.length === 0 ? (
            <div className="portal-empty">You haven't raised any support tickets yet.</div>
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr><th>Subject</th><th>Status</th><th>Last message</th><th>Updated</th><th /></tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t._id}>
                      <td>{t.subject}</td>
                      <td><span className={`portal-badge ${t.status === "open" ? "pending" : "approved"}`}>{t.status}</span></td>
                      <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.lastMessage ? `${t.lastMessage.senderRole === "admin" ? "Support: " : ""}${t.lastMessage.text}` : "—"}
                      </td>
                      <td>{new Date(t.updatedAt).toLocaleString()}</td>
                      <td>
                        <button className="portal-btn ghost small" onClick={() => openThread(t._id)}>
                          <MessageCircle size={14} /> Open
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
            <h2>New support ticket</h2>
            <form className="portal-form" onSubmit={submitTicket}>
              <div className="portal-field">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Can't verify my email"
                />
              </div>
              <div className="portal-field">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Describe the issue…"
                />
              </div>
              <div className="portal-form-actions">
                <button type="button" className="portal-btn ghost" onClick={() => setCreating(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn primary" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit"}
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
