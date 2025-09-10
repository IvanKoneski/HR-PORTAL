// Tasks.tsx — same logic, Figma-style UI
import { useEffect, useState } from "react";
import api from "../api/client";
import NavBar from "../components/NavBar";
import { useAuth } from "../auth/AuthContext";

/** Shape returned by /api/Tasks/my/list */
type MyTask = {
  id: string;
  workDate: string; // ISO
  taskDescription: string;
  hoursSpent: number;
};

export default function Tasks() {
  const { session } = useAuth();

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // optional filters
  const [from, setFrom] = useState<string>(""); // empty = no filter
  const [to, setTo] = useState<string>("");

  const [items, setItems] = useState<MyTask[]>([]);
  const [edit, setEdit] = useState<Record<string, { hoursSpent: number }>>({});

  const load = async (over?: { from?: string; to?: string }) => {
    if (!session) return;
    setMsg("");
    setLoading(true);
    try {
      const f = over?.from ?? from;
      const t = over?.to ?? to;

      const params: Record<string, string> = {};
      if (f) params.from = f;
      if (t) params.to = t;

      const res = await api.get<MyTask[]>("/api/Tasks/my/list", { params });

      const sorted = [...res.data].sort((a, b) =>
        a.workDate < b.workDate
          ? 1
          : a.workDate > b.workDate
          ? -1
          : a.id.localeCompare(b.id)
      );
      setItems(sorted);
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) load(); // load ALL on first mount (no filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const applyFilters = async () => load({ from, to });
  const clearFilters = async () => {
    setFrom("");
    setTo("");
    await load({ from: "", to: "" });
  };

  const startEdit = (t: MyTask) => {
    setEdit((x) => ({ ...x, [t.id]: { hoursSpent: t.hoursSpent } }));
  };

  const cancelEdit = (id: string) => {
    setEdit((x) => {
      const cp = { ...x };
      delete cp[id];
      return cp;
    });
  };

  const saveEdit = async (id: string) => {
    setMsg("");
    const payload = edit[id];
    if (!payload) return;
    try {
      await api.put(`/api/Tasks/${id}/hours`, {
        hoursSpent: payload.hoursSpent,
      });
      await load();
      cancelEdit(id);
      setMsg("✅ Hours updated");
    } catch (e: any) {
      setMsg(e?.response?.data ?? "Update failed");
    }
  };

  return (
    <div className="admin-surface">
      <NavBar />

      <div className="container">
        {/* Page title */}
        <div className="page-title">
          <div className="title-icon" />
          <h1>My Tasks</h1>
        </div>

        {/* Card */}
        <section className="card">
          <header className="card-header">
            <div className="card-title">
              <div className="title-chip library" />
              <span>My Tasks</span>
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

              <button className="btn btn-primary" onClick={applyFilters}>
                Apply
              </button>
              <button className="btn btn-muted" onClick={clearFilters}>
                Clear
              </button>
            </div>

            {/* Table / states */}
            {loading ? (
              <p className="muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="muted">No tasks found.</p>
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
                    {items.map((t) => {
                      const ed = edit[t.id];
                      const date = t.workDate.slice(0, 10);
                      return (
                        <tr key={t.id}>
                          <td>{date}</td>
                          <td className="text-accent">{t.taskDescription}</td>
                          <td>
                            {ed ? (
                              <input
                                className="inp"
                                type="number"
                                min={0}
                                step={0.5}
                                value={ed.hoursSpent}
                                onChange={(e) =>
                                  setEdit((x) => ({
                                    ...x,
                                    [t.id]: {
                                      hoursSpent: Number(e.target.value),
                                    },
                                  }))
                                }
                                style={{ width: 110 }}
                              />
                            ) : (
                              <span className="text-green">{t.hoursSpent}</span>
                            )}
                          </td>
                          <td className="nowrap">
                            {ed ? (
                              <>
                                <button
                                  className="btn btn-primary"
                                  onClick={() => saveEdit(t.id)}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-muted"
                                  onClick={() => cancelEdit(t.id)}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-outline"
                                onClick={() => startEdit(t)}
                              >
                                Edit hours
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
