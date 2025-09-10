// Manager.tsx — same logic, Figma-style UI
import { useEffect, useState } from "react";
import api, {
  listUsers,
  getTemplates,
  assignFromTemplate,
} from "../api/client";
import NavBar from "../components/NavBar";

// ===== Types =====
type LeaveItem = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  requestedByUsername?: string;
  submittedAt: string;
};

type UserLite = { id: string; username: string };
type Template = {
  id: string;
  taskDescription?: string;
  defaultHours?: number;
  workedHours?: number; // may be present from API
};

// util: YYYY-MM-DD
function fmtDateISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function onlyDate(iso?: string | null) {
  return iso ? iso.substring(0, 10) : "";
}

export default function Manager() {
  // ===== Pending Leave =====
  const [items, setItems] = useState<LeaveItem[]>([]);
  const [msg, setMsg] = useState("");

  const loadPending = async () => {
    setMsg("");
    const res = await api.get<LeaveItem[]>("/api/leave/pending");
    setItems(res.data);
  };

  useEffect(() => {
    loadPending();
  }, []);

  const approve = async (id: string, username: string) => {
    try {
      await api.put(`/api/leave/${id}/approve`);
      await loadPending();
      setMsg(`✅ Approved - ${id} - ${username}`);
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Approve failed");
    }
  };

  const reject = async (id: string, username: string) => {
    try {
      await api.put(`/api/leave/${id}/reject`);
      await loadPending();
      setMsg(`❌ Rejected - ${id} - ${username}`);
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Reject failed");
    }
  };

  // ===== Assign Task =====
  const [users, setUsers] = useState<UserLite[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assignTemplateId, setAssignTemplateId] = useState<string>("");
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignDate, setAssignDate] = useState<string>(fmtDateISO(new Date()));
  const [assignHours, setAssignHours] = useState<number>(0);

  // Initial load (users + templates)
  useEffect(() => {
    (async () => {
      try {
        const [u, t] = await Promise.all([listUsers(), getTemplates()]);
        setUsers(u.data ?? []);
        setTemplates(t.data ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Prefill hours from selected template
  useEffect(() => {
    const tpl = templates.find((x) => x.id === assignTemplateId);
    if (tpl) setAssignHours(Number(tpl.defaultHours ?? 0));
  }, [assignTemplateId, templates]);

  const loadTemplates = async () => {
    try {
      const r = await getTemplates();
      setTemplates(r.data ?? []);
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Failed to load templates");
    }
  };

  const onAssign = async () => {
    setMsg("");
    if (!assignTemplateId || !assignUserId || !assignDate) return;
    try {
      await assignFromTemplate({
        templateId: assignTemplateId,
        userId: assignUserId,
        workDate: assignDate,
        hoursOverride: assignHours,
      });
      setMsg("✅ Task assigned");
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Assign failed");
    }
  };

  /* ===================== RENDER (Figma style) ===================== */
  return (
    <div className="admin-surface">
      <NavBar />

      <div className="container">
        {/* Page title */}
        <div className="page-title">
          <div className="title-icon" />
          <h1>Manager</h1>
        </div>

        {/* PENDING LEAVE */}
        <section className="card">
          <header className="card-header">
            <div className="card-title">
              <div className="title-chip calendar" />
              <span>Pending Leave Requests</span>
            </div>
            <button className="btn btn-outline" onClick={loadPending}>
              <span className="icon refresh" /> Refresh
            </button>
          </header>

          <div className="card-body">
            {msg && <p className="info">{msg}</p>}

            {items.length === 0 ? (
              <p className="muted">No pending requests.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Dates</th>
                      <th>Reason</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const user = it.requestedByUsername ?? "-";
                      return (
                        <tr key={it.id}>
                          <td>{user}</td>
                          <td>
                            {onlyDate(it.startDate)} → {onlyDate(it.endDate)}
                          </td>
                          <td>{it.reason}</td>
                          <td>{onlyDate(it.submittedAt)}</td>
                          <td className="nowrap">
                            <button
                              className="btn btn-success"
                              onClick={() => approve(it.id, user)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-warning"
                              onClick={() => reject(it.id, user)}
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ASSIGN TASK */}
        <section className="card">
          <header className="card-header">
            <div className="card-title">
              <div className="title-chip assign" />
              <span>Assign Task</span>
            </div>
          </header>

          <div className="card-body">
            <div className="filters">
              <select
                className="inp"
                value={assignTemplateId}
                onChange={(e) => setAssignTemplateId(e.target.value)}
              >
                <option value="">-- pick task --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.taskDescription}
                  </option>
                ))}
              </select>

              <select
                className="inp"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
              >
                <option value="">-- pick user --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>

              <input
                className="inp"
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
              />
              <input
                className="inp"
                type="number"
                min={0}
                step={0.5}
                value={assignHours}
                onChange={(e) => setAssignHours(Number(e.target.value))}
                style={{ width: 110 }}
              />

              <button
                className="btn btn-accent"
                onClick={onAssign}
                disabled={!assignTemplateId || !assignUserId || !assignDate}
              >
                Assign
              </button>
            </div>
          </div>
        </section>

        {/* TASK LIBRARY — display only */}
        <section className="card">
          <header className="card-header">
            <div className="card-title">
              <div className="title-chip library" />
              <span>Task Library</span>
            </div>
            <button className="btn btn-outline" onClick={loadTemplates}>
              <span className="icon refresh" /> Refresh
            </button>
          </header>

          <div className="card-body">
            {templates.length === 0 ? (
              <p className="muted">No templates yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Planned</th>
                      <th>Worked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t) => (
                      <tr key={t.id}>
                        <td className="text-accent">{t.taskDescription}</td>
                        <td>{Number(t.defaultHours ?? 0)}h</td>
                        <td>
                          {typeof t.workedHours === "number"
                            ? `${Number(t.workedHours).toFixed(2)}h`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
