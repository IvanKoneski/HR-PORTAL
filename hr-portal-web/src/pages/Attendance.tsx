import React, { useEffect, useMemo, useState, type CSSProperties } from "react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import NavBar from "../components/NavBar";

/** ===== Types (Attendance) ===== */
type MyAttendanceItem = {
  workDate: string;
  clockIn?: string | null;
  clockOut?: string | null;
  taskId?: string | null;
  taskDescription?: string | null;
};

/** Minimal shape from /api/Tasks/my */
type TaskListItem = {
  id: string;
  taskDescription: string;
  workDate?: string | null;
  hoursSpent?: number | null;
  username?: string;
};

/** ===== Types (Leave) ===== */
type LeaveItem = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  submittedAt: string;
  reviewedByUsername?: string | null;
  reviewedAt?: string | null;
};

/** ===== Helpers ===== */
function fmtDateISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function onlyDate(iso?: string | null) {
  return iso ? iso.substring(0, 10) : "";
}
function hoursBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return "";
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return "";
  const hrs = (b - a) / 3_600_000;
  return hrs.toFixed(2);
}
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

export default function Attendance() {
  const { session: _session } = useAuth(); // avoid unused warning

  /** ========= My Attendance (TOP) ========= */
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState<string>(fmtDateISO(addDays(new Date(), -7)));
  const [to, setTo] = useState<string>(todayIso);

  const [attRows, setAttRows] = useState<MyAttendanceItem[]>([]);
  const [todayRows, setTodayRows] = useState<MyAttendanceItem[]>([]);
  const [hasOpen, setHasOpen] = useState<boolean>(false);
  const [attMsg, setAttMsg] = useState<string>("");
  const [attLoading, setAttLoading] = useState<boolean>(false);

  // ---- task picker state (shown on Clock out) ----
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [tasksToday, setTasksToday] = useState<TaskListItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(""); // '' = none

  const loadMyAttendance = async () => {
    setAttLoading(true);
    setAttMsg("");
    try {
      const res = await api.get<MyAttendanceItem[]>("/api/attendance/my", {
        params: { from, to },
      });
      const data = (res.data ?? [])
        .slice()
        .sort((a, b) =>
          onlyDate(b.workDate).localeCompare(onlyDate(a.workDate))
        );
      setAttRows(data);
    } catch (e: any) {
      setAttMsg(e?.response?.data ?? "Failed to load attendance");
    } finally {
      setAttLoading(false);
    }
  };

  // Load ALL rows for today and derive hasOpen = any row has clockIn && !clockOut
  const loadToday = async () => {
    try {
      const res = await api.get<MyAttendanceItem[]>("/api/attendance/my", {
        params: { from: todayIso, to: todayIso },
      });
      const rows = res.data ?? [];
      setTodayRows(rows);
      const open = rows.some((r) => !!r.clockIn && !r.clockOut);
      setHasOpen(open);
    } catch {
      setTodayRows([]);
      setHasOpen(false);
    }
  };

  // Load my tasks for TODAY (for the picker)
  const loadMyTasksForToday = async () => {
    setTasksLoading(true);
    try {
      const res = await api.get<TaskListItem[]>("/api/Tasks/my", {
        params: { from: todayIso, to: todayIso },
      });
      setTasksToday(res.data ?? []);
    } catch {
      setTasksToday([]);
    } finally {
      setTasksLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadMyAttendance();
    loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh when range changes
  useEffect(() => {
    loadMyAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const onClockIn = async () => {
    setAttMsg("");
    try {
      await api.post("/api/attendance/clock-in");
      await Promise.all([loadToday(), loadMyAttendance()]);
      setAttMsg("✅ Clocked in.");
    } catch (e: any) {
      setAttMsg(e?.response?.data ?? "Clock-in failed");
    }
  };

  // 1) Open picker on first click, 2) Confirm sends { taskId }, Cancel closes
  const beginClockOut = async () => {
    setAttMsg("");
    setSelectedTaskId(""); // default to "none"
    await loadMyTasksForToday();
    setPickerOpen(true);
  };

  const confirmClockOut = async () => {
    if (!selectedTaskId) {
      setAttMsg("Please choose a task for this interval before confirming.");
      return;
    }
    try {
      await api.post("/api/attendance/clock-out", { taskId: selectedTaskId });
      setPickerOpen(false);
      await Promise.all([loadToday(), loadMyAttendance()]);
      setAttMsg("✅ Clocked out.");
    } catch (e: any) {
      setAttMsg(e?.response?.data ?? "Clock-out failed");
    }
  };

  const cancelClockOut = () => {
    setPickerOpen(false);
    setSelectedTaskId("");
  };

  const canClockIn = !hasOpen;
  const canClockOut = hasOpen;

  /** ========= My Leave (BOTTOM) ========= */
  const [items, setItems] = useState<LeaveItem[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");

  const loadMine = async () => {
    const res = await api.get<LeaveItem[]>("/api/leave/my");
    setItems(res.data);
  };
  useEffect(() => {
    loadMine();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      await api.post("/api/leave", { startDate: start, endDate: end, reason });
      setStart("");
      setEnd("");
      setReason("");
      await loadMine();
      setMsg("✅ Request sent");
    } catch (err: any) {
      setMsg(err?.response?.data ?? "Failed to submit");
    }
  };

  // ======== DARK UI STYLES ========
  const C: Record<string, CSSProperties> = {
    page: {
      minHeight: "100svh",
      background:
        "radial-gradient(1200px 800px at 0% -10%, rgba(72,63,255,0.10), transparent 60%), linear-gradient(180deg,#0b1220 0%, #0b1526 100%)",
      color: "rgba(226,232,240,0.95)",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    },
    shell: { maxWidth: 1200, margin: "0 auto", padding: "16px 16px 48px" },
    h2: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 24,
      margin: "0 0 12px",
    },
    card: {
      background:
        "linear-gradient(180deg, rgba(23,32,53,0.9) 0%, rgba(17,26,45,0.9) 100%)",
      border: "1px solid rgba(99,102,241,0.18)",
      borderRadius: 16,
      boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      overflow: "hidden",
      marginTop: 16,
    },
    cardHeader: {
      padding: "14px 18px",
      background:
        "linear-gradient(90deg, rgba(59,130,246,0.08), rgba(139,92,246,0.06))",
      borderBottom: "1px solid rgba(99,102,241,0.18)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    headLeft: { display: "flex", alignItems: "center", gap: 10 },
    pill: {
      padding: "10px 14px",
      borderRadius: 12,
      background: "rgba(2,6,23,0.55)",
      border: "1px solid rgba(99,102,241,0.25)",
      display: "inline-flex",
      gap: 8,
      alignItems: "center",
    },
    range: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      flexWrap: "wrap",
      background: "rgba(2,6,23,0.55)",
      border: "1px solid rgba(99,102,241,0.18)",
      padding: 10,
      borderRadius: 12,
    },
    input: {
      height: 38,
      borderRadius: 10,
      border: "1px solid rgba(100,116,139,0.25)",
      background: "rgba(2,6,23,0.60)",
      color: "rgba(226,232,240,0.95)",
      padding: "0 10px",
      outline: "none",
    },
    btn: {
      height: 38,
      borderRadius: 10,
      padding: "0 14px",
      fontWeight: 700,
      color: "#fff",
      border: "1px solid rgba(99,102,241,0.35)",
      background: "linear-gradient(90deg, rgb(59,130,246), rgb(139,92,246))",
      boxShadow: "0 10px 22px rgba(99,102,241,0.35)",
      cursor: "pointer",
    },
    btnGhost: {
      height: 38,
      borderRadius: 10,
      padding: "0 14px",
      fontWeight: 700,
      color: "rgba(226,232,240,0.95)",
      border: "1px solid rgba(99,102,241,0.25)",
      background: "rgba(2,6,23,0.45)",
      cursor: "pointer",
    },
    tableWrap: { padding: 18 },
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      background: "rgba(10,16,30,0.55)",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid rgba(99,102,241,0.18)",
    },
    th: {
      textAlign: "left",
      padding: "12px 14px",
      fontSize: 13,
      color: "rgba(203,213,225,0.85)",
      background: "rgba(15,23,42,0.75)",
      borderBottom: "1px solid rgba(99,102,241,0.18)",
    },
    td: {
      padding: "12px 14px",
      fontSize: 14,
      borderTop: "1px solid rgba(99,102,241,0.10)",
    },
    tdLink: { color: "rgb(56,189,248)" },
    tdWarn: { color: "rgb(251,191,36)" },
    tdGood: { color: "rgb(16,185,129)" },
    pickerBox: {
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
      background: "rgba(2,6,23,0.55)",
      border: "1px dashed rgba(99,102,241,0.35)",
    },
    select: {
      height: 38,
      borderRadius: 10,
      border: "1px solid rgba(100,116,139,0.25)",
      background: "rgba(2,6,23,0.60)",
      color: "rgba(226,232,240,0.95)",
      padding: "0 10px",
    },
    badge: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      border: "1px solid rgba(251,191,36,0.45)",
      color: "rgb(251,191,36)",
      background: "rgba(251,191,36,0.12)",
    },
  };

  return (
    <div style={C.page}>
      <NavBar />
      <div style={C.shell}>
        {/* ===== Title ===== */}
        <h2 style={C.h2}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M8 7h8M8 11h8M8 15h5" />
            <rect x="3" y="4" width="18" height="16" rx="3" />
          </svg>
          My Attendance
        </h2>

        {/* ===== Card: Attendance ===== */}
        <div style={C.card}>
          {/* Header row: range + buttons */}
          <div style={C.cardHeader}>
            <div style={C.headLeft}>
              <div style={C.pill}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <span>My Attendance</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={C.range}>
                <span>From</span>
                <input
                  className="loginDarkInput"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  style={C.input}
                />
                <span>To</span>
                <input
                  className="loginDarkInput"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  style={C.input}
                />
                <button
                  onClick={loadMyAttendance}
                  disabled={attLoading}
                  style={C.btnGhost}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12a9 9 0 1 1-9-9" />
                      <path d="M21 3v6h-6" />
                    </svg>
                    Refresh
                  </span>
                </button>
              </div>

              <button
                onClick={onClockIn}
                disabled={!canClockIn}
                style={{ ...C.btn, opacity: canClockIn ? 1 : 0.5 }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                  Check in
                </span>
              </button>

              <button
                onClick={beginClockOut}
                disabled={!canClockOut}
                style={{ ...C.btnGhost, opacity: canClockOut ? 1 : 0.5 }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                  Clock out
                </span>
              </button>
            </div>
          </div>

          {/* Picker */}
          {pickerOpen && (
            <div style={C.pickerBox}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span>Task for this interval:</span>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  disabled={tasksLoading}
                  style={C.select}
                >
                  <option value="">Select task…</option>
                  {tasksToday.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.taskDescription}
                      {t.workDate ? ` — ${t.workDate.substring(0, 10)}` : ""}
                      {typeof t.hoursSpent === "number"
                        ? ` — ${t.hoursSpent}h`
                        : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={confirmClockOut}
                  disabled={tasksLoading || !selectedTaskId}
                  style={{ ...C.btn, opacity: selectedTaskId ? 1 : 0.6 }}
                >
                  Confirm
                </button>
                <button onClick={cancelClockOut} style={C.btnGhost}>
                  Cancel
                </button>
              </div>
              {tasksLoading && (
                <p style={{ marginTop: 6 }}>Loading your tasks…</p>
              )}
            </div>
          )}

          {attMsg && <p style={{ padding: "10px 18px" }}>{attMsg}</p>}

          {/* Table */}
          <div style={C.tableWrap}>
            {attRows.length === 0 ? (
              <p>No attendance in range.</p>
            ) : (
              <table style={C.table}>
                <thead>
                  <tr>
                    <th style={C.th}>Date</th>
                    <th style={C.th}>Clock in</th>
                    <th style={C.th}>Clock out</th>
                    <th style={C.th}>Hours</th>
                    <th style={C.th}>Task</th>
                  </tr>
                </thead>
                <tbody>
                  {attRows.map((r, i) => {
                    const hrs = hoursBetween(r.clockIn, r.clockOut);
                    const hrsStyle = !hrs
                      ? C.tdWarn
                      : parseFloat(hrs) > 0
                      ? C.tdGood
                      : undefined;
                    return (
                      <tr key={`${onlyDate(r.workDate)}-${i}`}>
                        <td style={C.td}>{onlyDate(r.workDate)}</td>
                        <td style={{ ...C.td, ...C.tdLink }}>
                          {fmtLocalTime(r.clockIn)}
                        </td>
                        <td style={{ ...C.td, ...C.tdLink }}>
                          {fmtLocalTime(r.clockOut)}
                        </td>
                        <td style={{ ...C.td, ...(hrsStyle || {}) }}>{hrs}</td>
                        <td style={C.td}>{r.taskDescription ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ===== Card: Leave ===== */}
        <h2 style={{ ...C.h2, marginTop: 28 }}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M8 7h8M8 11h8M8 15h5" />
            <rect x="3" y="4" width="18" height="16" rx="3" />
          </svg>
          My Leave
        </h2>

        <div style={C.card}>
          <div style={C.cardHeader} />
          <div style={{ padding: 18 }}>
            <form
              onSubmit={submit}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 2fr auto",
                gap: 10,
                alignItems: "end",
                background: "rgba(2,6,23,0.55)",
                border: "1px solid rgba(99,102,241,0.18)",
                padding: 12,
                borderRadius: 12,
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 12,
                    opacity: 0.85,
                  }}
                >
                  Start
                </label>
                <input
                  className="loginDarkInput"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  style={C.input}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 12,
                    opacity: 0.85,
                  }}
                >
                  End
                </label>
                <input
                  className="loginDarkInput"
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  style={C.input}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 12,
                    opacity: 0.85,
                  }}
                >
                  Reason
                </label>
                <input
                  className="loginDarkInput"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. vacation"
                  style={{ ...C.input, width: "100%" }}
                />
              </div>
              <button type="submit" style={C.btn}>
                Request
              </button>
            </form>

            {msg && <p style={{ marginTop: 10 }}>{msg}</p>}

            <h3 style={{ marginTop: 16, marginBottom: 10, fontSize: 16 }}>
              Recent requests
            </h3>
            <div
              style={{
                background: "rgba(2,6,23,0.55)",
                border: "1px solid rgba(99,102,241,0.18)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              {items.length === 0 ? (
                <p>No recent requests.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {items.map((it) => (
                    <li key={it.id} style={{ margin: "6px 0" }}>
                      {onlyDate(it.startDate)} — {onlyDate(it.endDate)} |{" "}
                      <a href="#" style={{ color: "rgb(56,189,248)" }}>
                        {it.reason || "-"}
                      </a>{" "}
                      <span style={{ ...C.badge, marginLeft: 8 }}>
                        {it.status}
                      </span>
                      {(it.reviewedByUsername || it.reviewedAt) && (
                        <span style={{ marginLeft: 8, opacity: 0.85 }}>
                          • Reviewed
                          {it.reviewedByUsername
                            ? ` by ${it.reviewedByUsername}`
                            : ""}
                          {it.reviewedAt
                            ? ` on ${onlyDate(it.reviewedAt)}`
                            : ""}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
