import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function NavBar() {
  const { session, logout } = useAuth();
  const nav = useNavigate();
  if (!session) return null;

  const doLogout = () => {
    logout();
    nav("/");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav-link active" : "nav-link";

  return (
    <nav className="appNav">
      <div className="appNav-left">
        <NavLink to="/attendance" className={linkClass}>
          Attendance
        </NavLink>

        {session.role !== "Admin" && (
          <NavLink to="/tasks" className={linkClass}>
            Tasks
          </NavLink>
        )}

        {session.role === "Manager" && (
          <NavLink to="/manager" className={linkClass}>
            Manager
          </NavLink>
        )}

        {session.role === "Admin" && (
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>
        )}

        {session.role === "Admin" && (
          <NavLink to="/admin-tasks" className={linkClass}>
            Tasks (Admin)
          </NavLink>
        )}
      </div>

      <div className="appNav-right">
        <span className="user">
          {session.username} ({session.role})
        </span>
        <button
          type="button"
          className="nav-logout"
          onClick={doLogout}
          style={{
            marginLeft: "12px",
            padding: "6px 14px",
            borderRadius: "20px",
            border: "1px solid #3b3f5c",
            background: "linear-gradient(90deg, #2a2d3e, #1f2233)",
            color: "#fff",
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            transition: "all 0.2s ease-in-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "linear-gradient(90deg, #3b4a7e, #2f3659)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "linear-gradient(90deg, #2a2d3e, #1f2233)";
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
