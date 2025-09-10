// Admin.tsx — SAME LOGIC, Figma-style UI (drop-in)
import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import NavBar from "../components/NavBar";
import { useAuth } from "../auth/AuthContext";

/* =========================
   Types used across panels
   ========================= */

type UserItem = {
  userId: string;
  username: string;
  role: "Admin" | "Manager" | "Employee";
};

type LeaveRow = {
  id: string;
  userId: string;
  username: string;
  requestedByUsername?: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
};

type TeamAttendanceItem = {
  userId: string;
  username: string;
  workDate: string; // ISO (yyyy-MM-dd)
  clockIn: string | null; // ISO datetime or null
  clockOut: string | null; // ISO datetime or null
  taskDescription?: string | null;
};

type AttendanceRow = {
  userId: string;
  username: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  taskDescription?: string | null;
};

/* Small helpers */
const onlyDate = (iso: string) => iso.slice(0, 10);
function fmtLocalTime(iso?: string | null) {
  if (!iso) return "";
  const normalized = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  const d = new Date(normalized);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function Admin() {
  const { session } = useAuth();

  /* ---------------- Users panel state ---------------- */
  const [users, setUsers] = useState<UserItem[]>([]);
  const [editingUser, setEditingUser] = useState<
    Record<
      string,
      { username: string; role: UserItem["role"]; password?: string }
    >
  >({});
  const [newUser, setNewUser] = useState<{
    username: string;
    role: UserItem["role"];
    password: string;
  } | null>(null);
  const [userMsg, setUserMsg] = useState("");
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);

  /* ---------------- Leave panel state ---------------- */
  const [pendingLeave, setPendingLeave] = useState<LeaveRow[]>([]);
  const [leaveMsg, setLeaveMsg] = useState("");
  const [leaveEditId, setLeaveEditId] = useState<string | null>(null);
  const [leaveEditForm, setLeaveEditForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null);

  /* ---------------- Attendance panel state ----------- */
  const [attMsg, setAttMsg] = useState("");
  const [attLoading, setAttLoading] = useState(false);
  const [attFrom, setAttFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [attTo, setAttTo] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [attUser, setAttUser] = useState<string>("");
  const [attTask, setAttTask] = useState<string>("");

  const [attOpen, setAttOpen] = useState<TeamAttendanceItem[]>([]);
  const [attRows, setAttRows] = useState<AttendanceRow[]>([]);

  const adminHeaders = { "X-Role": "Admin" as const };
  const reviewerHeaders = {
    "X-Role": "Admin" as const,
    "X-UserId": session?.userId ?? "",
  };

  /* ===================== EFFECTS / LOADERS ===================== */

  const loadUsers = async () => {
    setUserMsg("");
    try {
      const res = await api.get<UserItem[]>("/api/users");
      setUsers(res.data ?? []);
    } catch (e: any) {
      setUserMsg(e?.response?.data ?? "Failed to load users");
    }
  };

  const loadPendingLeave = async () => {
    setLeaveMsg("");
    try {
      const res = await api.get<LeaveRow[]>("/api/leave/pending");
      setPendingLeave(res.data ?? []);
    } catch (e: any) {
      setLeaveMsg(e?.response?.data ?? "Failed to load pending leave");
    }
  };

  const loadAttendance = async () => {
    setAttMsg("");
    setAttLoading(true);
    try {
      const headers = { "X-Role": "Admin" as const };
      const todayIso = new Date().toISOString().slice(0, 10);

      // open intervals for today
      const teamToday = await api.get<TeamAttendanceItem[]>(
        "/api/attendance/team",
        {
          params: { date: todayIso },
          headers,
        }
      );
      const open = (teamToday.data ?? [])
        .filter((r) => !r.clockOut)
        .sort(
          (a, b) =>
            a.username.localeCompare(b.username) ||
            (b.clockIn ?? "").localeCompare(a.clockIn ?? "")
        );
      setAttOpen(open);

      // history in range
      const from = new Date(attFrom);
      const to = new Date(attTo);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);

      const days: string[] = [];
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d).toISOString().slice(0, 10));
      }

      let rows: AttendanceRow[] = [];
      for (const d of days) {
        const resp = await api.get<TeamAttendanceItem[]>(
          "/api/attendance/team",
          { params: { date: d }, headers }
        );
        let dayRows = resp.data ?? [];
        if (attUser) {
          const uid = attUser.toLowerCase();
          dayRows = dayRows.filter(
            (r) => (r.userId ?? "").toLowerCase() === uid
          );
        }
        if (attTask && attTask.trim()) {
          const q = attTask.trim().toLowerCase();
          dayRows = dayRows.filter((r) =>
            (r.taskDescription ?? "").toLowerCase().includes(q)
          );
        }
        rows = rows.concat(dayRows);
      }

      rows = rows.filter(
        (r) => !(r.workDate?.slice(0, 10) === todayIso && !r.clockOut)
      );
      rows.sort((a, b) => {
        const byDate = (b.workDate ?? "").localeCompare(a.workDate ?? "");
        if (byDate !== 0) return byDate;
        const aTime = a.clockOut ?? a.clockIn ?? "";
        const bTime = b.clockOut ?? b.clockIn ?? "";
        return bTime.localeCompare(aTime);
      });

      setAttRows(rows);
    } catch (e: any) {
      setAttOpen([]);
      setAttRows([]);
      setAttMsg(e?.response?.data ?? "Failed to load attendance");
    } finally {
      setAttLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    loadUsers();
    loadPendingLeave();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, attFrom, attTo, attUser, attTask]);

  /* ===================== USERS: handlers ===================== */

  const startEditUser = (u: UserItem) =>
    setEditingUser((x) => ({
      ...x,
      [u.userId]: { username: u.username, role: u.role },
    }));

  const cancelEditUser = (id: string) =>
    setEditingUser((x) => {
      setConfirmUserId(null);
      const cp = { ...x };
      delete cp[id];
      return cp;
    });

  const saveUser = async (id: string) => {
    const payload = editingUser[id];
    if (!payload) return;
    setUserMsg("");
    try {
      await api.put(`/api/users/${id}`, {
        username: payload.username,
        role: payload.role,
        password:
          payload.password && payload.password.length > 0
            ? payload.password
            : undefined,
      });
      await loadUsers();
      cancelEditUser(id);
      setUserMsg("✅ User saved.");
    } catch (e: any) {
      setUserMsg(e?.response?.data ?? "Failed to save user");
    }
  };

  const createUser = () => {
    if (!newUser) setNewUser({ username: "", role: "Employee", password: "" });
  };

  const saveNewUser = async () => {
    if (!newUser) return;
    setUserMsg("");
    try {
      await api.post("/api/users", {
        username: newUser.username,
        role: newUser.role,
        password: newUser.password,
      });
      await loadUsers();
      setNewUser(null);
      setUserMsg("✅ User created.");
    } catch (e: any) {
      setUserMsg(e?.response?.data ?? "Failed to create user");
    }
  };

  const cancelNewUser = () => setNewUser(null);

  const deleteUser = async (id: string) => {
    setUserMsg("");
    try {
      await api.delete(`/api/users/${id}`);
      await loadUsers();
      setUserMsg("✅ User deleted.");
    } catch (e: any) {
      setUserMsg(e?.response?.data ?? "Failed to delete user");
    } finally {
      setConfirmUserId(null);
    }
  };

  /* ===================== LEAVE: handlers ===================== */

  const approveLeave = async (id: string) => {
    try {
      await api.put(`/api/leave/${id}/approve`, null, {
        headers: reviewerHeaders,
      });
      await loadPendingLeave();
    } catch (e: any) {
      setLeaveMsg(e?.response?.data ?? "Failed to approve leave");
    }
  };

  const rejectLeave = async (id: string) => {
    try {
      await api.put(`/api/leave/${id}/reject`, null, {
        headers: reviewerHeaders,
      });
      await loadPendingLeave();
    } catch (e: any) {
      setLeaveMsg(e?.response?.data ?? "Failed to reject leave");
    }
  };

  const deleteLeave = async (id: string) => {
    try {
      await api.delete(`/api/leave/${id}/delete`, { headers: adminHeaders });
      await loadPendingLeave();
    } catch (e: any) {
      setLeaveMsg(e?.response?.data ?? "Failed to delete leave request");
    }
  };

  const beginEditLeave = (r: LeaveRow) => {
    setLeaveEditId(r.id);
    const toISO = (s: string) => (s?.length >= 10 ? s.slice(0, 10) : s || "");
    setLeaveEditForm({
      startDate: toISO(r.startDate),
      endDate: toISO(r.endDate),
      reason: r.reason ?? "",
    });
  };

  const cancelEditLeave = () => setLeaveEditId(null);

  const saveEditLeave = async () => {
    if (!leaveEditId) return;
    if (new Date(leaveEditForm.startDate) > new Date(leaveEditForm.endDate)) {
      alert("Start date must be before or equal to end date.");
      return;
    }
    try {
      await api.put(`/api/leave/${leaveEditId}/edit`, leaveEditForm, {
        headers: adminHeaders,
      });
      await loadPendingLeave();
      setLeaveEditId(null);
    } catch (e: any) {
      setLeaveMsg(e?.response?.data ?? "Failed to edit leave request");
    }
  };

  /* ================ USER SELECT for Attendance filter ================ */

  const userOptions = useMemo(
    () =>
      [{ userId: "", username: "(all)" }, ...users].map((u) => (
        <option key={u.userId || "all"} value={u.userId}>
          {u.username || "(all)"}
        </option>
      )),
    [users]
  );

  /* ===================== RENDER ===================== */

  return (
    <div className="admin-surface">
      <NavBar />

      <div className="container">
        <div className="page-title">
          <div className="title-icon" />
          <h1>Admin Dashboard</h1>
        </div>

        {/* USERS PANEL */}
        <section className="card">
          <header className="card-header">
            <div className="card-title">
              <div className="title-chip users" />
              <span>Users</span>
            </div>
            <button
              className="btn btn-accent"
              onClick={createUser}
              disabled={!!newUser}
            >
              <span className="icon plus" /> Create User
            </button>
          </header>

          <div className="card-body">
            {userMsg && <p className="info">{userMsg}</p>}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Password</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {newUser && (
                    <tr>
                      <td>
                        <input
                          className="inp"
                          value={newUser.username}
                          onChange={(e) =>
                            setNewUser({ ...newUser, username: e.target.value })
                          }
                          placeholder="username"
                        />
                      </td>
                      <td>
                        <select
                          className="inp"
                          value={newUser.role}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              role: e.target.value as UserItem["role"],
                            })
                          }
                        >
                          <option>Employee</option>
                          <option>Manager</option>
                          <option>Admin</option>
                        </select>
                      </td>
                      <td>
                        <input
                          className="inp"
                          type="password"
                          value={newUser.password}
                          onChange={(e) =>
                            setNewUser({ ...newUser, password: e.target.value })
                          }
                          placeholder="password"
                        />
                      </td>
                      <td className="nowrap">
                        <button
                          className="btn btn-primary"
                          onClick={saveNewUser}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-muted"
                          onClick={cancelNewUser}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  )}

                  {users.map((u) => {
                    const ed = editingUser[u.userId];
                    return (
                      <tr key={u.userId}>
                        <td>
                          {ed ? (
                            <input
                              className="inp"
                              value={ed.username}
                              onChange={(e) =>
                                setEditingUser((x) => ({
                                  ...x,
                                  [u.userId]: {
                                    ...ed,
                                    username: e.target.value,
                                  },
                                }))
                              }
                            />
                          ) : (
                            u.username
                          )}
                        </td>
                        <td>
                          {ed ? (
                            <select
                              className="inp"
                              value={ed.role}
                              onChange={(e) =>
                                setEditingUser((x) => ({
                                  ...x,
                                  [u.userId]: {
                                    ...ed,
                                    role: e.target.value as UserItem["role"],
                                  },
                                }))
                              }
                            >
                              <option>Employee</option>
                              <option>Manager</option>
                              <option>Admin</option>
                            </select>
                          ) : (
                            <span
                              className={`badge role-${u.role.toLowerCase()}`}
                            >
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td>
                          {ed ? (
                            <input
                              className="inp"
                              type="password"
                              placeholder="(leave blank = keep)"
                              onChange={(e) =>
                                setEditingUser((x) => ({
                                  ...x,
                                  [u.userId]: {
                                    ...ed,
                                    password: e.target.value,
                                  },
                                }))
                              }
                            />
                          ) : (
                            <span className="dots">••••••</span>
                          )}
                        </td>
                        <td className="nowrap">
                          {ed ? (
                            confirmUserId === u.userId ? (
                              <>
                                <span className="warn">Delete this user?</span>
                                <button
                                  className="btn btn-danger"
                                  onClick={() => deleteUser(u.userId)}
                                >
                                  Yes
                                </button>
                                <button
                                  className="btn btn-muted"
                                  onClick={() => setConfirmUserId(null)}
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn btn-primary"
                                  onClick={() => saveUser(u.userId)}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-muted"
                                  onClick={() => cancelEditUser(u.userId)}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="btn btn-danger"
                                  onClick={() => setConfirmUserId(u.userId)}
                                >
                                  Delete
                                </button>
                              </>
                            )
                          ) : (
                            <button
                              className="btn btn-outline"
                              onClick={() => startEditUser(u)}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* PENDING LEAVE PANEL */}
        <section className="card">
          <header className="card-header">
            <div className="card-title">
              <div className="title-chip calendar" />
              <span>Pending Leave (edit / approve / reject / delete)</span>
            </div>
          </header>

          <div className="card-body">
            {leaveMsg && <p className="info">{leaveMsg}</p>}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLeave.map((r) => {
                    const isEditing = leaveEditId === r.id;
                    return (
                      <tr key={r.id}>
                        <td>{r.requestedByUsername}</td>

                        <td>
                          {isEditing ? (
                            <input
                              className="inp"
                              type="date"
                              value={leaveEditForm.startDate}
                              onChange={(e) =>
                                setLeaveEditForm((p) => ({
                                  ...p,
                                  startDate: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            onlyDate(r.startDate)
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className="inp"
                              type="date"
                              value={leaveEditForm.endDate}
                              onChange={(e) =>
                                setLeaveEditForm((p) => ({
                                  ...p,
                                  endDate: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            onlyDate(r.endDate)
                          )}
                        </td>

                        <td>
                          {isEditing ? (
                            <input
                              className="inp"
                              type="text"
                              value={leaveEditForm.reason}
                              onChange={(e) =>
                                setLeaveEditForm((p) => ({
                                  ...p,
                                  reason: e.target.value,
                                }))
                              }
                              placeholder="Reason"
                            />
                          ) : (
                            r.reason
                          )}
                        </td>

                        <td className="nowrap">
                          {!isEditing ? (
                            confirmLeaveId === r.id ? (
                              <>
                                <span className="warn">
                                  Delete this request?
                                </span>
                                <button
                                  className="btn btn-danger"
                                  onClick={() => deleteLeave(r.id)}
                                >
                                  Yes
                                </button>
                                <button
                                  className="btn btn-muted"
                                  onClick={() => setConfirmLeaveId(null)}
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn btn-outline"
                                  onClick={() => beginEditLeave(r)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-success"
                                  onClick={() => approveLeave(r.id)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-warning"
                                  onClick={() => rejectLeave(r.id)}
                                >
                                  Reject
                                </button>
                                <button
                                  className="btn btn-danger"
                                  onClick={() => setConfirmLeaveId(r.id)}
                                >
                                  Delete
                                </button>
                              </>
                            )
                          ) : (
                            <>
                              <button
                                className="btn btn-primary"
                                onClick={saveEditLeave}
                              >
                                Save
                              </button>
                              <button
                                className="btn btn-muted"
                                onClick={cancelEditLeave}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ATTENDANCE */}
        <section className="card">
          <header className="card-header">
            <div className="card-title">
              <div className="title-chip clock" />
              <span>Attendance</span>
            </div>
            <button className="btn btn-outline" onClick={loadAttendance}>
              <span className="icon refresh" /> Refresh
            </button>
          </header>

          <div className="card-body">
            {/* Filters */}
            <div className="filters">
              <label>
                From{" "}
                <input
                  className="inp"
                  type="date"
                  value={attFrom}
                  onChange={(e) => setAttFrom(e.target.value)}
                />
              </label>
              <label>
                To{" "}
                <input
                  className="inp"
                  type="date"
                  value={attTo}
                  onChange={(e) => setAttTo(e.target.value)}
                />
              </label>
              <label>
                User{" "}
                <select
                  className="inp"
                  value={attUser}
                  onChange={(e) => setAttUser(e.target.value)}
                >
                  {userOptions}
                </select>
              </label>
              <label>
                Task{" "}
                <input
                  className="inp"
                  value={attTask}
                  onChange={(e) => setAttTask(e.target.value)}
                  placeholder="contains…"
                />
              </label>
            </div>

            {attMsg && <p className="info">{attMsg}</p>}

            <div className="scroll-area">
              {attLoading ? (
                <p className="muted">Loading…</p>
              ) : (
                <>
                  {attOpen.length > 0 && (
                    <>
                      <h4 className="subhead">Clocked-in right now</h4>
                      <div className="table-wrap">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>User</th>
                              <th>Date</th>
                              <th>Clock in</th>
                              <th>Task</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attOpen.map((r, i) => (
                              <tr key={`open-${i}`}>
                                <td>{r.username}</td>
                                <td>{onlyDate(r.workDate)}</td>
                                <td className="text-green">
                                  {fmtLocalTime(r.clockIn)}
                                </td>
                                <td>{r.taskDescription || ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  <h4 className="subhead">Recent</h4>
                  {attRows.length === 0 ? (
                    <p className="muted">No attendance in range.</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Date</th>
                            <th>Clock in</th>
                            <th>Clock out</th>
                            <th>Task</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attRows.map((r, i) => (
                            <tr key={`hist-${i}`}>
                              <td>{r.username}</td>
                              <td>{onlyDate(r.workDate)}</td>
                              <td className="text-green">
                                {fmtLocalTime(r.clockIn)}
                              </td>
                              <td className="text-red">
                                {fmtLocalTime(r.clockOut)}
                              </td>
                              <td>{r.taskDescription || ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
