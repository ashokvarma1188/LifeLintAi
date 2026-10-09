import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Droplet, Phone, Check, X, Plus } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { SkeletonRows, SkeletonCards } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import api from "../services/api";
import { getUser } from "../services/auth";
import { listDonors, setDonorStatus } from "../services/donors";
import {
  createBloodRequest,
  listRequestsForDonor,
  myBloodRequests,
  respondToBloodRequest,
  fulfilBloodRequest,
  cancelBloodRequest,
} from "../services/bloodRequests";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";
import { DonationCard } from "../components/DonationCard";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function BloodDonation() {
  const navigate = useNavigate();
  const isCivilian = ["civilian", "citizen", undefined].includes(getUser()?.role);
  const [tab, setTab] = useState(isCivilian ? "requests" : "post");

  // Donor profile
  const [myBloodGroup, setMyBloodGroup] = useState("");
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);

  // Donor directory
  const [donors, setDonors] = useState([]);
  const [filter, setFilter] = useState("");

  // Requests this donor can help with
  const [requestsForMe, setRequestsForMe] = useState([]);
  // Requests this civilian has raised
  const [myRequests, setMyRequests] = useState([]);
  const [requestForm, setRequestForm] = useState({ bloodGroup: "", unitsNeeded: 1, notes: "" });
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [coords, setCoords] = useState(null);

  const loadAll = async (coordsArg) => {
    try {
      const [profile, donorList, forMe, mine] = await Promise.all([
        api.get("/profile/me").then((r) => r.data),
        listDonors(filter),
        listRequestsForDonor(coordsArg).catch(() => []),
        myBloodRequests().catch(() => []),
      ]);
      setMyBloodGroup(profile.bloodGroup || "");
      setAvailable(Boolean(profile.donorAvailable));
      setDonors(donorList);
      setRequestsForMe(forMe);
      setMyRequests(mine);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load blood donation data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (!navigator.geolocation) {
        await loadAll();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const c = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setCoords(c);
          loadAll(c);
        },
        () => loadAll()
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAvailable = async () => {
    if (!myBloodGroup) {
      setError("Set your blood group in My Profile first, so donors can be matched correctly.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const next = !available;
      await setDonorStatus(next, myBloodGroup);
      setAvailable(next);
      setNotice(next ? "You're now listed as an available donor." : "You're no longer listed as a donor.");
      await loadAll(coords);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update your donor status."));
    } finally {
      setSaving(false);
    }
  };

  const applyFilter = async (bloodGroup) => {
    setFilter(bloodGroup);
    setLoading(true);
    try {
      const donorList = await listDonors(bloodGroup);
      setDonors(donorList);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load donors."));
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.bloodGroup) return setError("Pick the blood group needed.");
    setPosting(true);
    setError("");
    setNotice("");
    try {
      await createBloodRequest(requestForm.bloodGroup, requestForm.unitsNeeded, requestForm.notes, coords);
      setNotice("Blood request posted — compatible donors nearby can now see and respond to it.");
      setRequestForm({ bloodGroup: "", unitsNeeded: 1, notes: "" });
      await loadAll(coords);
    } catch (err) {
      setError(getErrorMessage(err, "Could not post this request."));
    } finally {
      setPosting(false);
    }
  };

  const respond = async (id, status) => {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      await respondToBloodRequest(id, status);
      setNotice(status === "accepted" ? "Thank you for accepting — your phone number is shared with the requester." : "Marked as declined.");
      await loadAll(coords);
    } catch (err) {
      setError(getErrorMessage(err, "Could not respond to this request."));
    } finally {
      setBusyId(null);
    }
  };

  const closeRequest = async (id, action) => {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      if (action === "fulfil") await fulfilBloodRequest(id);
      else await cancelBloodRequest(id);
      setNotice(action === "fulfil" ? "Marked as fulfilled." : "Request cancelled.");
      await loadAll(coords);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update this request."));
    } finally {
      setBusyId(null);
    }
  };

  const STATUS_BADGE = { open: "pending", fulfilled: "approved", cancelled: "rejected" };

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        <div className="portal-head">
          <div>
            <h1>Blood donation</h1>
            <p>Post a real request for compatible donors, or offer to donate yourself.</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0 }}>
            {isCivilian && (
              <button className={`portal-btn ${tab === "requests" ? "primary" : "ghost"}`} onClick={() => setTab("requests")}>
                Requests for you
              </button>
            )}
            <button className={`portal-btn ${tab === "post" ? "primary" : "ghost"}`} onClick={() => setTab("post")}>
              Request blood
            </button>
            <button className={`portal-btn ${tab === "mine" ? "primary" : "ghost"}`} onClick={() => setTab("mine")}>
              My requests
            </button>
            <button className={`portal-btn ${tab === "directory" ? "primary" : "ghost"}`} onClick={() => setTab("directory")}>
              Donor directory
            </button>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {isCivilian && (
          <div className="portal-panel" style={{ marginBottom: 20 }}>
            <div className="portal-head" style={{ marginBottom: 0 }}>
              <div>
                <h1 style={{ fontSize: 16 }}>
                  {myBloodGroup ? `Your blood group: ${myBloodGroup}` : "Blood group not set"}
                </h1>
                <p>{available ? "You are listed as an available donor." : "You are not currently listed as a donor."}</p>
              </div>
              <button className={`portal-btn ${available ? "danger" : "primary"}`} onClick={toggleAvailable} disabled={saving}>
                <Droplet size={16} /> {saving ? "Saving…" : available ? "Stop showing as donor" : "I'm available to donate"}
              </button>
            </div>
          </div>
        )}

        {isCivilian && <DonationCard onChange={() => loadAll(coords)} />}

        {tab === "requests" && isCivilian && (
          <div className="portal-panel">
            {!available || !myBloodGroup ? (
              <div className="portal-empty">Mark yourself as an available donor above to see requests you're compatible with.</div>
            ) : loading ? (
              <SkeletonCards count={2} />
            ) : requestsForMe.length === 0 ? (
              <EmptyState icon={Droplet} title="No open requests match your blood group right now." hint="Compatible requests nearby will show up here." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {requestsForMe.map((r) => (
                  <div key={r._id} className="portal-panel" style={{ margin: 0 }}>
                    <div className="portal-head" style={{ marginBottom: 6 }}>
                      <div>
                        <h1 style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                          <Droplet size={14} /> {r.bloodGroup} needed · {r.unitsNeeded} unit{r.unitsNeeded > 1 ? "s" : ""}
                        </h1>
                        <p>
                          Requested by {r.requestedBy?.name || "Unknown"} · {new Date(r.createdAt).toLocaleString()}
                          {r.distanceKm != null ? ` · ${r.distanceKm} km away` : ""}
                          {r.notes ? ` · ${r.notes}` : ""}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="portal-btn primary small" disabled={busyId === r._id} onClick={() => respond(r._id, "accepted")}>
                        <Check size={13} /> Accept
                      </button>
                      <button className="portal-btn danger small" disabled={busyId === r._id} onClick={() => respond(r._id, "declined")}>
                        <X size={13} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "post" && (
          <div className="portal-panel">
            <form className="portal-form" onSubmit={submitRequest}>
              <div className="portal-row">
                <div className="portal-field">
                  <label htmlFor="reqBloodGroup">Blood group needed</label>
                  <select
                    id="reqBloodGroup"
                    value={requestForm.bloodGroup}
                    onChange={(e) => setRequestForm({ ...requestForm, bloodGroup: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div className="portal-field">
                  <label htmlFor="units">Units needed</label>
                  <input
                    id="units"
                    type="number"
                    min="1"
                    value={requestForm.unitsNeeded}
                    onChange={(e) => setRequestForm({ ...requestForm, unitsNeeded: e.target.value })}
                  />
                </div>
              </div>
              <div className="portal-field">
                <label htmlFor="reqNotes">Notes (optional)</label>
                <textarea
                  id="reqNotes"
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder="e.g. Needed for surgery at Apollo Hospital"
                />
              </div>
              <div className="portal-form-actions">
                <button className="portal-btn primary" type="submit" disabled={posting}>
                  <Plus size={16} /> {posting ? "Posting…" : "Post request"}
                </button>
              </div>
              <span className="hint">
                Compatible, available donors nearby will see this under their &quot;Requests for you&quot; tab.
              </span>
            </form>
          </div>
        )}

        {tab === "mine" && (
          <div className="portal-panel">
            {loading ? (
              <SkeletonCards count={2} />
            ) : myRequests.length === 0 ? (
              <EmptyState icon={Droplet} title="You haven't posted any blood requests yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {myRequests.map((r) => (
                  <div key={r._id} className="portal-panel" style={{ margin: 0 }}>
                    <div className="portal-head" style={{ marginBottom: 6 }}>
                      <div>
                        <h1 style={{ fontSize: 15 }}>{r.bloodGroup} · {r.unitsNeeded} unit{r.unitsNeeded > 1 ? "s" : ""}</h1>
                        <p>{new Date(r.createdAt).toLocaleString()}{r.notes ? ` · ${r.notes}` : ""}</p>
                      </div>
                      <span className={`portal-badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                    </div>

                    {r.responses.length > 0 && (
                      <div className="portal-table-wrap" style={{ marginBottom: 10 }}>
                        <table className="portal-table">
                          <thead>
                            <tr><th>Donor</th><th>Blood group</th><th>Phone</th><th>Response</th></tr>
                          </thead>
                          <tbody>
                            {r.responses.map((resp) => (
                              <tr key={resp.donorId?._id || resp._id}>
                                <td>{resp.donorId?.name || "Unknown"}</td>
                                <td>{resp.donorId?.bloodGroup || "—"}</td>
                                <td>
                                  {resp.status === "accepted" && resp.donorId?.phone ? (
                                    <a href={`tel:${resp.donorId.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                      <Phone size={12} /> {resp.donorId.phone}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td><span className={`portal-badge ${resp.status === "accepted" ? "approved" : "rejected"}`}>{resp.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {r.status === "open" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="portal-btn primary small" disabled={busyId === r._id} onClick={() => closeRequest(r._id, "fulfil")}>
                          Mark fulfilled
                        </button>
                        <button className="portal-btn danger small" disabled={busyId === r._id} onClick={() => closeRequest(r._id, "cancel")}>
                          Cancel request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "directory" && (
          <>
            <div className="portal-toolbar">
              <span className="status-text" style={{ marginRight: 8 }}>Filter by blood group:</span>
              <button className={`portal-btn ${filter === "" ? "primary" : "ghost"} small`} onClick={() => applyFilter("")}>
                All
              </button>
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  className={`portal-btn ${filter === bg ? "primary" : "ghost"} small`}
                  onClick={() => applyFilter(bg)}
                >
                  {bg}
                </button>
              ))}
            </div>

            <div className="portal-panel">
              {loading ? (
                <SkeletonRows rows={4} cols={3} />
              ) : donors.length === 0 ? (
                <div className="portal-empty">No available donors {filter ? `for ${filter}` : ""} right now.</div>
              ) : (
                <div className="portal-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Blood group</th>
                        <th>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donors.map((d) => (
                        <tr key={d._id}>
                          <td>{d.name}</td>
                          <td><span className="portal-badge type">{d.bloodGroup}</span></td>
                          <td>
                            {d.phone ? (
                              <a href={`tel:${d.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <Phone size={13} /> {d.phone}
                              </a>
                            ) : (
                              "—"
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
      </div>
    </div>
  );
}

export default BloodDonation;
