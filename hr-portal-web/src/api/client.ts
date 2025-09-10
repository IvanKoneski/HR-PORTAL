// src/api/client.ts
import axios from "axios";

// Create a single axios instance for the whole app.
// baseURL comes from your .env file (VITE_API_BASEURL).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASEURL,
});

// ----- Auth session -----
export type Session = {
  userId: string;
  username: string;
  role: "Admin" | "Manager" | "Employee";
};

// After login, we'll call setSessionHeaders(session)
// so every API call includes X-UserId and X-Role.
export function setSessionHeaders(s?: Session) {
  if (!s) {
    delete api.defaults.headers.common["X-UserId"];
    delete api.defaults.headers.common["X-Role"];
    return;
  }
  api.defaults.headers.common["X-UserId"] = s.userId;
  api.defaults.headers.common["X-Role"] = s.role;
}

// Export the axios instance for the rest of the app to use.
export default api;

/* ===================== Types ===================== */

export type Template = {
  id: string;
  taskDescription: string;
  defaultHours: number;
};

export type TaskListItem = {
  id: string;
  userId: string;
  username: string;
  workDate: string;        // ISO from backend
  taskDescription: string;
  hoursSpent: number;
};

export type UserLite = { id: string; username: string };

/* ===================== API Calls ===================== */

/** Admin/Manager: list all tasks in a range; optionally filter by userId */
export function listAllTasks(params: { from: string; to: string; userId?: string }) {
  return api.get<TaskListItem[]>("/api/Tasks/all", { params });
}

/** Admin: fetch task templates */
export function getTemplates() {
  return api.get<Template[]>("/api/Tasks/templates");
}

/** Admin: create a new task template */
export function createTemplate(body: { taskDescription: string; defaultHours?: number }) {
  return api.post<Template>("/api/Tasks/templates", body);
}

/** Admin: delete a task template */
export function deleteTemplate(id: string) {
  return api.delete(`/api/Tasks/templates/${id}`);
}

/** Admin: assign a task from a template to a user on a date */
export function assignFromTemplate(body: {
  templateId: string;
  userId: string;       // MUST be the GUID
  workDate: string;     // "yyyy-MM-dd"
  hoursOverride?: number;
}) {
  return api.post("/api/Tasks/admin/assign-from-template", body);
}

/**
 * Admin: list users for dropdowns.
 * We NORMALIZE the response so the UI always gets:
 *   { id: <GUID>, username: <login> }
 * This fixes cases where the backend returns { userId, username } or
 * mistakenly returns { id: username }.
 */
export async function listUsers(): Promise<{ data: UserLite[] }> {
  const r = await api.get<any[]>("/api/Users");
  const data: UserLite[] = (r.data ?? []).map((row: any) => {
    // Prefer GUID from 'userId' when present; otherwise fall back to 'id'
    const guid = row.userId ?? row.id;

    // Pick a reasonable username field
    const uname =
      row.username ??
      row.userName ??   // some APIs use this casing
      row.name ??       // last resort
      row.email ??      // last resort
      String(guid);     // ensure we never return undefined

    return {
      id: String(guid),         // force to string
      username: String(uname),  // force to string
    };
  });
  // Return a minimal { data } object since callers use `res.data`
  return { data };
}

export function updateTemplate(
  id: string,
  body: { taskDescription: string; defaultHours: number }
) {
  // Returns the updated Template
  return api.put<Template>(`/api/Tasks/templates/${id}`, body);
}