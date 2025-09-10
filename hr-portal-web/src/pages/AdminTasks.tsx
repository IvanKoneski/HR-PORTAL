// AdminTasks.tsx — same logic, Figma-style UI
import api, {
  listUsers,
  listAllTasks,
  getTemplates,
  createTemplate,
  deleteTemplate,
  assignFromTemplate,
} from "../api/client";
import type { Template, TaskListItem, UserLite } from "../api/client";
import { updateTemplate } from "../api/client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import NavBar from "../components/NavBar";

type TemplateWithWorked = Template & { workedHours?: number };

// util: YYYY-MM-DD
function fmtDateISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function deltaDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// safe keys
const kUser = (u: Partial<UserLite>, i: number) =>
  `user-${u.id ?? u.username ?? "x"}-${i}`;
const kTpl = (t: Partial<Template>, i: number) => `tpl-${t.id ?? i}`;

export default function AdminTasks() {
  const { session } = useAuth();
  const isAdmin = session?.role === "Admin";

  const today = useMemo(() => new Date(), []);
  const weekAgoISO = useMemo(() => fmtDateISO(deltaDays(today, -7)), [today]);
  const weekAheadISO = useMemo(() => fmtDateISO(deltaDays(today, +7)), [today]);

  // Team Tasks (filters + results)
  const [from, setFrom] = useState<string>(weekAgoISO);
  const [to, setTo] = useState<string>(weekAheadISO);
  const [userFilter, setUserFilter] = useState<string>("");
  const [templateFilterId, setTemplateFilterId] = useState<string>("");
  const [users, setUsers] = useState<UserLite[]>([]);
  const [teamTasks, setTeamTasks] = useState<TaskListItem[]>([]);

  // Inline editing state (Team Tasks)
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editHours, setEditHours] = useState<number>(0);
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null);

  // Task Library
  const [templates, setTemplates] = useState<TemplateWithWorked[]>([]);
  const [tplDesc, setTplDesc] = useState<string>("");
  const [tplDefaultHours, setTplDefaultHours] = useState<number>(0);

  // Inline edit for template row
  const [tplEditId, setTplEditId] = useState<string | null>(null);
  const [tplEditDesc, setTplEditDesc] = useState<string>("");
  const [tplEditHours, setTplEditHours] = useState<number>(0);

  // Assign Task
  const [assignTemplateId, setAssignTemplateId] = useState<string>("");
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignDate, setAssignDate] = useState<string>(fmtDateISO(today));
  const [assignHours, setAssignHours] = useState<number>(0);
  const [confirmTplId, setConfirmTplId] = useState<string | null>(null);

  // My Tasks (admin personal)
  const [myFrom, setMyFrom] = useState<string>(weekAgoISO);
  const [myTo, setMyTo] = useState<string>(weekAheadISO);
  const [myItems, setMyItems] = useState<
    {
      id: string;
      workDate: string;
      taskDescription: string;
      hoursSpent: number;
    }[]
  >([]);
  const [myEditId, setMyEditId] = useState<string | null>(null);
  const [myEditHours, setMyEditHours] = useState<number>(0);

  const [msg, setMsg] = useState<string>("");

  // Initial load
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const [u, t] = await Promise.all([listUsers(), getTemplates()]);
        setUsers(u.data ?? []);
        setTemplates(t.data ?? []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [isAdmin]);

  // when template changes, prefill hours
  useEffect(() => {
    const tpl = templates.find((x) => x.id === assignTemplateId);
    if (tpl) setAssignHours(tpl.defaultHours ?? 0);
  }, [assignTemplateId, templates]);

  // Resolve current user's ID for "My Tasks"
  const resolveMyUserId = () => {
    if ((session as any)?.userId) return (session as any).userId as string;
    if (session?.username) {
      const u = users.find((uu) => uu.username === session.username);
      return u?.id;
    }
    return undefined;
  };

  // Loaders
  const loadTeam = async () => {
    setMsg("");
    try {
      const res = await listAllTasks({
        from,
        to,
        userId: userFilter || undefined,
      });
      let rows = res.data ?? [];
      if (templateFilterId) {
        const tpl = templates.find((t) => t.id === templateFilterId);
        const d = tpl?.taskDescription?.trim();
        if (d)
          rows = rows.filter((r) => (r.taskDescription ?? "").trim() === d);
      }
      setTeamTasks(rows);
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Failed to load tasks");
    }
  };

  const loadMy = async () => {
    setMsg("");
    try {
      const myUid = resolveMyUserId();
      const res = await listAllTasks({
        from: myFrom,
        to: myTo,
        userId: myUid || undefined,
      });
      let rows = res.data ?? [];
      if (!myUid && session?.username)
        rows = rows.filter((r) => r.username === session.username);
      setMyItems(rows);
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Failed to load my tasks");
    }
  };

  const loadTemplates = async () => {
    try {
      const r = await getTemplates();
      setTemplates(r.data ?? []);
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Failed to load templates");
    }
  };

  const onCreateTemplate = async () => {
    setMsg("");
    if (!tplDesc.trim()) return;
    try {
      await createTemplate({
        taskDescription: tplDesc.trim(),
        defaultHours: tplDefaultHours,
      });
      setTplDesc("");
      setTplDefaultHours(0);
      await loadTemplates();
      setMsg("✅ Template created");
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Create template failed");
    }
  };

  const onDeleteTemplate = async (id: string) => {
    setMsg("");
    try {
      await deleteTemplate(id);
      await loadTemplates();
      setMsg("🗑️ Template removed");
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Delete template failed");
    } finally {
      setConfirmTplId(null);
    }
  };

  const startTplEdit = (t: Template) => {
    setTplEditId(t.id);
    setTplEditDesc(t.taskDescription ?? "");
    setTplEditHours(Number(t.defaultHours ?? 0));
  };
  const cancelTplEdit = () => {
    setConfirmTplId(null);
    setTplEditId(null);
    setTplEditDesc("");
    setTplEditHours(0);
  };
  const saveTplEdit = async () => {
    if (!tplEditId) return;
    setMsg("");
    try {
      await updateTemplate(tplEditId, {
        taskDescription: tplEditDesc.trim(),
        defaultHours: tplEditHours,
      });
      await loadTemplates();
      cancelTplEdit();
      setMsg("✅ Template updated");
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Update template failed");
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
      await loadTeam();
      setMsg("✅ Task assigned");
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Assign failed");
    }
  };

  // Inline edit actions (Team Tasks)
  const startEdit = (t: TaskListItem) => {
    setEditId(t.id);
    setEditDate((t.workDate ?? "").substring(0, 10));
    setEditDesc(t.taskDescription ?? "");
    setEditHours(Number(t.hoursSpent ?? 0));
  };
  const cancelEdit = () => {
    setConfirmTaskId(null);
    setEditId(null);
    setEditDate("");
    setEditDesc("");
    setEditHours(0);
  };
  const saveEdit = async () => {
    if (!editId) return;
    setMsg("");
    try {
      await api.put(
        `/api/tasks/${editId}/edit`,
        {
          taskDescription: editDesc.trim(),
          hoursSpent: editHours,
          workDate: editDate,
        },
        { headers: { "X-Role": "Admin" } }
      );
      await loadTeam();
      cancelEdit();
      setMsg("✅ Task updated");
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Update failed");
    }
  };
  const deleteTask = async (id: string) => {
    setMsg("");
    try {
      await api.delete(`/api/tasks/${id}/delete`, {
        headers: { "X-Role": "Admin" },
      });
      if (editId === id) cancelEdit();
      await loadTeam();
      setMsg("🗑️ Task deleted");
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Delete failed");
    } finally {
      setConfirmTaskId(null);
    }
  };

  // Inline edit actions (My Tasks — hours only)
  const startMyEdit = (row: { id: string; hoursSpent: number }) => {
    setMyEditId(row.id);
    setMyEditHours(Number(row.hoursSpent ?? 0));
  };
  const cancelMyEdit = () => {
    setMyEditId(null);
    setMyEditHours(0);
  };
  const saveMyEdit = async () => {
    if (!myEditId) return;
    const myUid = resolveMyUserId();
    if (!myUid) {
      setMsg("Cannot resolve current user ID for hours update.");
      return;
    }
    try {
      await api.put(
        `/api/tasks/${myEditId}/hours`,
        { hoursSpent: myEditHours },
        {
          headers: { "X-UserId": myUid, "X-Role": session?.role ?? "Employee" },
        }
      );
      await loadMy();
      cancelMyEdit();
      setMsg("✅ Hours updated");
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Update hours failed");
    }
  };

  // AUTO LOAD
  useEffect(() => {
    if (isAdmin) loadTeam();
  }, [isAdmin, from, to, userFilter, templateFilterId, templates]); // eslint-disable-line
  useEffect(() => {
    if (isAdmin) loadMy();
  }, [isAdmin, myFrom, myTo, users, session?.username]); // eslint-disable-line

  if (!isAdmin) {
    return (
      <div
        style={{
          fontFamily: "sans-serif",
          maxWidth: 1000,
          margin: "20px auto",
        }}
      >
        <NavBar />
        <h2>Admin — Tasks</h2>
        <p>You must be an Admin to view this page.</p>
      </div>
    );
  }

  /* ===================== RENDER (Figma style) ===================== */
  return (
    <div className="admin-surface">
      <NavBar />
      <div className="container">
        <div className="page-title">
          <div className="title-icon" />
          <h1>Admin — Tasks</h1>
        </div>

        {/* TEAM TASKS */}
        <section className="card">
          <header className="card-header">
            <div className="card-title">
              <div className="title-chip users" />
              <span>Team Tasks</span>
            </div>
          </header>

          <div className="card-body">
            {msg && <p className="info">{msg}</p>}

            {/* Filters */}
            <div className="filters">
              <label>
                From{" "}
                <input
                  className="inp"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                To{" "}
                <input
                  className="inp"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>

              <label>
                User{" "}
                <select
                  className="inp"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                >
                  <option key="all" value="">
                    All
                  </option>
                  {users.map((u, i) => (
                    <option key={kUser(u, i)} value={u.id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Template{" "}
                <select
                  className="inp"
                  value={templateFilterId}
                  onChange={(e) => setTemplateFilterId(e.target.value)}
                >
                  <option key="tpl-all" value="">
                    All
                  </option>
                  {templates.map((t, i) => (
                    <option key={kTpl(t, i)} value={t.id}>
                      {t.taskDescription}
                    </option>
                  ))}
                </select>
              </label>

              <button className="btn btn-outline" onClick={loadTeam}>
                <span className="icon refresh" /> Refresh
              </button>
            </div>

            {/* Table */}
            {teamTasks.length === 0 ? (
              <p className="muted">No tasks.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Date</th>
                      <th>Task</th>
                      <th>Hours</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamTasks.map((t) => {
                      const isEditing = editId === t.id;
                      return (
                        <tr key={t.id}>
                          <td>{t.username}</td>
                          <td>
                            {isEditing ? (
                              <input
                                className="inp"
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                              />
                            ) : (
                              t.workDate?.substring(0, 10)
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                className="inp"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                              />
                            ) : (
                              <span className="text-accent">
                                {t.taskDescription}
                              </span>
                            )}
                          </td>
                          <td className="text-green">{t.hoursSpent}</td>
                          <td className="nowrap">
                            {isEditing ? (
                              confirmTaskId === t.id ? (
                                <>
                                  <span className="warn">
                                    Delete this task?
                                  </span>
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => deleteTask(t.id)}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    className="btn btn-muted"
                                    onClick={() => setConfirmTaskId(null)}
                                  >
                                    No
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="btn btn-primary"
                                    onClick={saveEdit}
                                    disabled={!editDesc.trim() || !editDate}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="btn btn-muted"
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => setConfirmTaskId(t.id)}
                                  >
                                    Delete
                                  </button>
                                </>
                              )
                            ) : (
                              <button
                                className="btn btn-outline"
                                onClick={() => startEdit(t)}
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
                <option key="picktpl" value="">
                  -- pick task --
                </option>
                {templates.map((t, i) => (
                  <option key={kTpl(t, i)} value={t.id}>
                    {t.taskDescription}
                  </option>
                ))}
              </select>

              <select
                className="inp"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
              >
                <option key="pickuser" value="">
                  -- pick user --
                </option>
                {users.map((u, i) => (
                  <option key={kUser(u, i)} value={u.id}>
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

        {/* TASK LIBRARY */}
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
            <div className="filters">
              <input
                className="inp"
                placeholder="Task description"
                value={tplDesc}
                onChange={(e) => setTplDesc(e.target.value)}
                style={{ minWidth: 260, flex: "1 1 260px" }}
              />
              <input
                className="inp"
                type="number"
                min={0}
                step={0.5}
                value={tplDefaultHours}
                onChange={(e) => setTplDefaultHours(Number(e.target.value))}
                style={{ width: 110 }}
              />
              <button
                className="btn btn-accent"
                onClick={onCreateTemplate}
                disabled={!tplDesc.trim()}
              >
                Create
              </button>
            </div>

            {templates.length === 0 ? (
              <p className="muted">No templates yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Planned</th>
                        <th>Worked</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((t, i) => {
                        const editing = tplEditId === t.id;
                        return (
                          <tr key={kTpl(t, i)}>
                            <td>
                              {editing ? (
                                <input
                                  className="inp"
                                  value={tplEditDesc}
                                  onChange={(e) =>
                                    setTplEditDesc(e.target.value)
                                  }
                                />
                              ) : (
                                <span className="text-accent">
                                  {t.taskDescription}
                                </span>
                              )}
                            </td>
                            <td>{Number(t.defaultHours ?? 0)}h</td>
                            <td>
                              {typeof (t as any).workedHours === "number"
                                ? `${(t as any).workedHours.toFixed(2)}h`
                                : "-"}
                            </td>
                            <td className="nowrap">
                              {editing ? (
                                <>
                                  <input
                                    className="inp"
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={tplEditHours}
                                    onChange={(e) =>
                                      setTplEditHours(Number(e.target.value))
                                    }
                                    style={{ width: 110, marginRight: 8 }}
                                  />
                                  <button
                                    className="btn btn-primary"
                                    onClick={saveTplEdit}
                                    disabled={!tplEditDesc.trim()}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="btn btn-muted"
                                    onClick={cancelTplEdit}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : confirmTplId === t.id ? (
                                <>
                                  <span className="warn">
                                    Delete this template?
                                  </span>
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => onDeleteTemplate(t.id)}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    className="btn btn-muted"
                                    onClick={() => setConfirmTplId(null)}
                                  >
                                    No
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="btn btn-outline"
                                    onClick={() => startTplEdit(t)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => setConfirmTplId(t.id)}
                                  >
                                    Delete
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
            )}
          </div>
        </section>

        {/* MY TASKS */}
        <section className="card">
          <header className="card-header">
            <div className="card-title">
              <div className="title-chip clock" />
              <span>My Tasks</span>
            </div>
          </header>

          <div className="card-body">
            <div className="filters">
              <label>
                From{" "}
                <input
                  className="inp"
                  type="date"
                  value={myFrom}
                  onChange={(e) => setMyFrom(e.target.value)}
                />
              </label>
              <label>
                To{" "}
                <input
                  className="inp"
                  type="date"
                  value={myTo}
                  onChange={(e) => setMyTo(e.target.value)}
                />
              </label>
              <button className="btn btn-outline" onClick={loadMy}>
                <span className="icon refresh" /> Refresh
              </button>
            </div>

            {myItems.length === 0 ? (
              <p className="muted">No tasks in this range.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Task</th>
                      <th>Hours</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myItems.map((x) => {
                      const editing = myEditId === x.id;
                      return (
                        <tr key={`my-${x.id}`}>
                          <td>{x.workDate.substring(0, 10)}</td>
                          <td className="text-accent">{x.taskDescription}</td>
                          <td>
                            {editing ? (
                              <input
                                className="inp"
                                type="number"
                                min={0}
                                step={0.5}
                                value={myEditHours}
                                onChange={(e) =>
                                  setMyEditHours(Number(e.target.value))
                                }
                                style={{ width: 110 }}
                              />
                            ) : (
                              <span className="text-green">{x.hoursSpent}</span>
                            )}
                          </td>
                          <td className="nowrap">
                            {editing ? (
                              <>
                                <button
                                  className="btn btn-primary"
                                  onClick={saveMyEdit}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-muted"
                                  onClick={cancelMyEdit}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-outline"
                                onClick={() => startMyEdit(x)}
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
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
