import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Check, X, Ban, RotateCcw, FileText, Download, Plus, Megaphone, Users } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import AppNavbar from "./AppNavbar";
import api, { getErrorMessage } from "../services/api";
import {
  listPending, listAllUsers, approveUser, rejectUser, suspendUser, reactivateUser,
  getAnalytics, getAuditLog, getActionLog, roleLabel,
} from "../services/admin";
import { listAllAnnouncements, createAnnouncement, deactivateAnnouncement } from "../services/announcements";
import SupportThread from "../components/SupportThread";
import { SkeletonRows } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { listAllTickets, getTicket as getSupportTicket, replyToTicket, closeTicket } from "../services/support";
import { downloadCsv } from "../utils/csv";
import "./Dashboard.css";
import "./portal.css";

const SOS_COLORS = { pending: "#e5a72a", accepted: "#2a9df4", resolved: "#0f9d63", cancelled: "#e5484d" };

function StatCard({ label, value, sub }) {
  return (
    <div className="portal-panel" style={{ margin: 0 }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function AdminConsole() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || "pending");
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [auditEntries, setAuditEntries] = useState([]);
  const [actionLogEntries, setActionLogEntries] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [openTicket, setOpenTicket] = useState(null);

  const load = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (tab === "pending" || tab === "all") {
          const data = tab === "pending" ? await listPending() : await listAllUsers();
          if (cancelled) return;
          setUsers(data);
        } else if (tab === "analytics") {
          const data = await getAnalytics();
          if (cancelled) return;
          setAnalytics(data);
        } else if (tab === "audit") {
          const data = await getAuditLog();
          if (cancelled) return;
          setAuditEntries(data);
        } else if (tab === "actionlog") {
          const data = await getActionLog();
          if (cancelled) return;
          setActionLogEntries(data);
        } else if (tab === "announcements") {
          const data = await listAllAnnouncements();
          if (cancelled) return;
          setAnnouncements(data);
        } else if (tab === "support") {
          const data = await listAllTickets();
          if (cancelled) return;
          setTickets(data);
        }
        setError("");
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Could not load data."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, reloadKey]);

  const decide = async (user, action) => {
    setBusyId(user.id);
    setError("");
    try {
      let updated;
      let verb;
      if (action === "approve") { updated = await approveUser(user.id); verb = "approved"; }
      else if (action === "reject") { updated = await rejectUser(user.id); verb = "rejected"; }
      else if (action === "suspend") { updated = await suspendUser(user.id); verb = "suspended"; }
      else { updated = await reactivateUser(user.id); verb = "reactivated"; }
      setNotice(`${updated.orgName || updated.name} was ${verb}.`);
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the account."));
    } finally {
      setBusyId(null);
    }
  };

  const viewDocument = async (userId) => {
    try {
      const response = await api.get(`/admin/document/${userId}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this document."));
    }
  };

  const postAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    setPostingAnnouncement(true);
    setError("");
    try {
      await createAnnouncement(newAnnouncement.trim());
      setNewAnnouncement("");
      setNotice("Announcement posted.");
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not post the announcement."));
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const removeAnnouncement = async (id) => {
    setBusyId(id);
    try {
      await deactivateAnnouncement(id);
      setNotice("Announcement removed.");
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove the announcement."));
    } finally {
      setBusyId(null);
    }
  };

  const visibleUsers = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.orgName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const openSupportThread = async (id) => {
    try {
      setOpenTicket(await getSupportTicket(id));
    } catch (err) {
      setError(getErrorMessage(err, "Could not open this ticket."));
    }
  };

  const handleTicketReply = async (id, message) => {
    const updated = await replyToTicket(id, message);
    setOpenTicket(updated);
    load();
  };

  const handleTicketClose = async (id) => {
    await closeTicket(id);
    await openSupportThread(id);
    load();
  };

  const exportAccountsCsv = () => {
    downloadCsv(`lifelink-accounts-${tab}.csv`, visibleUsers, [
      { label: "Name", get: (u) => u.name },
      { label: "Organisation", get: (u) => u.orgName || "" },
      { label: "Licence #", get: (u) => u.licenseNumber || "" },
      { label: "Email", get: (u) => u.email },
      { label: "Role", get: (u) => roleLabel(u.role) },
      { label: "Status", get: (u) => u.roleStatus },
      { label: "Suspended", get: (u) => (u.suspended ? "yes" : "no") },
    ]);
  };

  const exportAuditCsv = () => {
    downloadCsv("lifelink-audit-log.csv", auditEntries, [
      { label: "Patient", get: (e) => e.patientId?.name || "" },
      { label: "Hospital", get: (e) => e.hospitalId?.orgName || e.hospitalId?.name || "" },
      { label: "Action", get: (e) => e.action },
      { label: "When", get: (e) => new Date(e.createdAt).toLocaleString() },
    ]);
  };

  const exportActionLogCsv = () => {
    downloadCsv("lifelink-admin-action-log.csv", actionLogEntries, [
      { label: "Admin", get: (e) => e.adminId?.name || e.adminId?.email || "Unknown" },
      { label: "Action", get: (e) => e.action },
      { label: "Target account", get: (e) => e.targetUserId?.orgName || e.targetUserId?.name || "Unknown" },
      { label: "Target email", get: (e) => e.targetUserId?.email || "" },
      { label: "Target role", get: (e) => roleLabel(e.targetUserId?.role) },
      { label: "When", get: (e) => new Date(e.createdAt).toLocaleString() },
    ]);
  };

  const sosPieData = analytics
    ? Object.entries(analytics.sos.byStatus).map(([status, count]) => ({ name: status, value: count }))
    : [];

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        <div className="portal-head">
          <div>
            <h1>Admin console</h1>
            <p>Approve accounts, monitor the platform, and review access.</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0, flexWrap: "wrap" }}>
            {[
              { key: "pending", label: "Pending" },
              { key: "all", label: "All accounts" },
              { key: "analytics", label: "Analytics" },
              { key: "audit", label: "Audit log" },
              { key: "actionlog", label: "Admin activity" },
              { key: "announcements", label: "Announcements" },
              { key: "support", label: "Support" },
            ].map((t) => (
              <button
                key={t.key}
                className={`portal-btn ${tab === t.key ? "primary" : "ghost"}`}
                onClick={() => { setLoading(true); setTab(t.key); }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {(tab === "pending" || tab === "all") && (
          <div className="portal-panel">
            {!loading && users.length > 0 && (
              <div className="portal-toolbar" style={{ marginBottom: 12, justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="Search name, org or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="all">All roles</option>
                    <option value="civilian">Civilian</option>
                    <option value="hospital">Hospital</option>
                    <option value="police">Police</option>
                    <option value="firestation">Fire Station</option>
                    <option value="pharmacy">Pharmacy</option>
                  </select>
                </div>
                <button className="portal-btn ghost small" onClick={exportAccountsCsv}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
            )}
            {loading ? (
              <SkeletonRows rows={5} cols={7} />
            ) : users.length === 0 ? (
              <EmptyState
                icon={Users}
                title={tab === "pending" ? "No organisation accounts are waiting for approval." : "No accounts found."}
              />
            ) : visibleUsers.length === 0 ? (
              <div className="portal-empty">No accounts match that search.</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Organisation</th>
                      <th>Licence #</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Doc</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.orgName || "—"}</td>
                        <td>{user.licenseNumber || "—"}</td>
                        <td>{user.email}</td>
                        <td>{roleLabel(user.role)}</td>
                        <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span className={`portal-badge ${user.roleStatus}`}>{user.roleStatus}</span>
                          {user.suspended && <span className="portal-badge rejected">suspended</span>}
                        </td>
                        <td>
                          {user.hasVerificationDoc ? (
                            <button className="portal-btn ghost small" onClick={() => viewDocument(user.id)}>
                              <FileText size={14} /> View
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {user.role !== "admin" && user.roleStatus !== "approved" && (
                            <button
                              className="portal-btn primary small"
                              disabled={busyId === user.id}
                              onClick={() => decide(user, "approve")}
                            >
                              <Check size={14} /> Approve
                            </button>
                          )}
                          {user.role !== "admin" && user.roleStatus !== "rejected" && (
                            <button
                              className="portal-btn danger small"
                              style={{ marginLeft: 8 }}
                              disabled={busyId === user.id}
                              onClick={() => decide(user, "reject")}
                            >
                              <X size={14} /> Reject
                            </button>
                          )}
                          {user.role !== "admin" && (
                            user.suspended ? (
                              <button
                                className="portal-btn ghost small"
                                style={{ marginLeft: 8 }}
                                disabled={busyId === user.id}
                                onClick={() => decide(user, "reactivate")}
                              >
                                <RotateCcw size={14} /> Reactivate
                              </button>
                            ) : (
                              <button
                                className="portal-btn ghost small"
                                style={{ marginLeft: 8 }}
                                disabled={busyId === user.id}
                                onClick={() => decide(user, "suspend")}
                              >
                                <Ban size={14} /> Suspend
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "analytics" && (
          loading ? (
            <div className="portal-panel"><div className="portal-empty">Loading analytics…</div></div>
          ) : !analytics ? null : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
                <StatCard label="Total SOS alerts" value={analytics.sos.total} />
                <StatCard label="False-alarm rate" value={`${analytics.sos.falseAlarmRate}%`} sub="Cancelled / total" />
                <StatCard
                  label="Avg. time to accept"
                  value={analytics.sos.avgAcceptMinutes !== null ? `${analytics.sos.avgAcceptMinutes} min` : "—"}
                />
                <StatCard label="Suspended accounts" value={analytics.suspendedCount} />
              </div>

              <div className="portal-panel" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0, fontSize: 14.5 }}>SOS requests by status</h3>
                {analytics.sos.total === 0 ? (
                  <div className="portal-empty">No SOS requests yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={sosPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {sosPieData.map((entry) => (
                          <Cell key={entry.name} fill={SOS_COLORS[entry.name] || "#999"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", fontSize: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="portal-panel" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0, fontSize: 14.5 }}>Users by role</h3>
                <div className="portal-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr><th>Role</th><th>Approved</th><th>Pending</th><th>Rejected</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(analytics.usersByRole).map(([role, counts]) => (
                        <tr key={role}>
                          <td>{roleLabel(role)}</td>
                          <td>{counts.approved}</td>
                          <td>{counts.pending}</td>
                          <td>{counts.rejected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="portal-panel">
                <h3 style={{ marginTop: 0, fontSize: 14.5 }}>Incident reports</h3>
                <div className="portal-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr><th>Department</th><th>Open</th><th>Resolved</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(analytics.incidentReports).map(([dept, counts]) => (
                        <tr key={dept}>
                          <td>{dept === "firestation" ? "Fire Station" : "Police"}</td>
                          <td>{counts.open}</td>
                          <td>{counts.resolved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        )}

        {tab === "audit" && (
          <div className="portal-panel">
            {!loading && auditEntries.length > 0 && (
              <div className="portal-form-actions" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
                <button className="portal-btn ghost small" onClick={exportAuditCsv}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
            )}
            {loading ? (
              <SkeletonRows rows={5} cols={4} />
            ) : auditEntries.length === 0 ? (
              <div className="portal-empty">No hospital has accessed any patient's records yet.</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr><th>Patient</th><th>Hospital</th><th>Action</th><th>When</th></tr>
                  </thead>
                  <tbody>
                    {auditEntries.map((e) => (
                      <tr key={e._id}>
                        <td>{e.patientId?.name || "Unknown"}</td>
                        <td>{e.hospitalId?.orgName || e.hospitalId?.name || "Unknown"}</td>
                        <td>{e.action === "viewed" ? "Viewed file" : "Added report"}</td>
                        <td>{new Date(e.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "actionlog" && (
          <div className="portal-panel">
            {!loading && actionLogEntries.length > 0 && (
              <div className="portal-form-actions" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
                <button className="portal-btn ghost small" onClick={exportActionLogCsv}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
            )}
            {loading ? (
              <SkeletonRows rows={5} cols={5} />
            ) : actionLogEntries.length === 0 ? (
              <div className="portal-empty">No moderation actions have been taken yet.</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr><th>Admin</th><th>Action</th><th>Account</th><th>Role</th><th>When</th></tr>
                  </thead>
                  <tbody>
                    {actionLogEntries.map((e) => (
                      <tr key={e._id}>
                        <td>{e.adminId?.name || e.adminId?.email || "Unknown"}</td>
                        <td><span className={`portal-badge ${e.action === "approved" || e.action === "reactivated" ? "approved" : "rejected"}`}>{e.action}</span></td>
                        <td>{e.targetUserId?.orgName || e.targetUserId?.name || "Unknown"}</td>
                        <td>{roleLabel(e.targetUserId?.role)}</td>
                        <td>{new Date(e.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "announcements" && (
          <>
            <div className="portal-panel" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0, fontSize: 14.5 }}>Post an announcement</h3>
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: -8 }}>
                Shown as a banner on every signed-in user's dashboard.
              </p>
              <form className="portal-form" onSubmit={postAnnouncement}>
                <div className="portal-field">
                  <label htmlFor="announcementMsg">Message</label>
                  <textarea
                    id="announcementMsg"
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="e.g. Scheduled maintenance tonight from 11 PM - 1 AM."
                  />
                </div>
                <div className="portal-form-actions">
                  <button className="portal-btn primary" type="submit" disabled={postingAnnouncement}>
                    <Plus size={16} /> {postingAnnouncement ? "Posting…" : "Post announcement"}
                  </button>
                </div>
              </form>
            </div>

            <div className="portal-panel">
              {loading ? (
                <SkeletonRows rows={4} cols={3} />
              ) : announcements.length === 0 ? (
                <div className="portal-empty">No announcements yet.</div>
              ) : (
                <div className="portal-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr><th>Message</th><th>Status</th><th>Posted</th><th /></tr>
                    </thead>
                    <tbody>
                      {announcements.map((a) => (
                        <tr key={a._id}>
                          <td>
                            <Megaphone size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
                            {a.message}
                          </td>
                          <td>
                            <span className={`portal-badge ${a.active ? "approved" : "rejected"}`}>
                              {a.active ? "active" : "removed"}
                            </span>
                          </td>
                          <td>{new Date(a.createdAt).toLocaleString()}</td>
                          <td>
                            {a.active && (
                              <button
                                className="portal-btn danger small"
                                disabled={busyId === a._id}
                                onClick={() => removeAnnouncement(a._id)}
                              >
                                <X size={14} /> Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "support" && (
          <div className="portal-panel">
            {loading ? (
              <SkeletonRows rows={4} cols={5} />
            ) : tickets.length === 0 ? (
              <EmptyState title="No support tickets have been raised yet." />
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr><th>From</th><th>Subject</th><th>Status</th><th>Last message</th><th>Updated</th><th /></tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t._id}>
                        <td>{t.createdBy?.name || "Unknown"}</td>
                        <td>{t.subject}</td>
                        <td><span className={`portal-badge ${t.status === "open" ? "pending" : "approved"}`}>{t.status}</span></td>
                        <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.lastMessage ? `${t.lastMessage.senderRole === "admin" ? "You: " : ""}${t.lastMessage.text}` : "—"}
                        </td>
                        <td>{new Date(t.updatedAt).toLocaleString()}</td>
                        <td>
                          <button className="portal-btn ghost small" onClick={() => openSupportThread(t._id)}>
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {openTicket && (
        <div className="portal-modal-backdrop" onClick={() => setOpenTicket(null)}>
          <SupportThread
            ticket={openTicket}
            onReply={handleTicketReply}
            onClose={handleTicketClose}
            onDone={() => setOpenTicket(null)}
          />
        </div>
      )}
    </div>
  );
}

export default AdminConsole;
