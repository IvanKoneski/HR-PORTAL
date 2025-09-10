import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const { login } = useAuth();

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      await login(u, p);
      nav("/attendance");
    } catch (err: any) {
      setMsg(err?.response?.data ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100svh",
      position: "relative" as const,
      overflow: "hidden",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      color: "rgba(226,232,240,0.95)",
    },
    bg: {
      position: "absolute" as const,
      inset: 0,
      backgroundImage:
        "url('https://images.unsplash.com/photo-1631058966876-46372856c06d?auto=format&fit=crop&w=1600&q=80')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
    overlay: {
      position: "absolute" as const,
      inset: 0,
      background: "rgba(2,6,23,0.90)",
      backdropFilter: "blur(2px)",
    },
    container: {
      position: "relative" as const,
      minHeight: "100svh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding:"24px 12px "  //"48px 24px",
    },
    card: {
      width: "100%",
      maxWidth: 520,
      borderRadius: 14,
      background: "rgba(15,23,42,0.75)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.35)",
      border: "1px solid rgba(148,163,184,0.10)",
      overflow: "hidden",
    },
    header: {
      padding: "22px 26px 18px",
      background:
        "linear-gradient(180deg, rgba(30,41,59,0.9) 0%, rgba(30,41,59,0.7) 100%)",
      borderBottom: "1px solid rgba(148,163,184,0.12)",
      textAlign: "center" as const,
    },
    iconWrap: {
      width: 40,
      height: 40,
      margin: "0 auto 12px",
      borderRadius: 12,
      display: "grid",
      placeItems: "center",
      background:
        "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.25))",
      border: "1px solid rgba(99,102,241,0.35)",
    },
    title: { fontSize: 20, fontWeight: 700, margin: 0, color: "#e5e7eb" },
    subtitle: { marginTop: 6, fontSize: 13, color: "rgba(203,213,225,0.75)" },
    splitLine: {
      height: 1,
      background:
        "linear-gradient(90deg, transparent, rgba(148,163,184,0.12), transparent)",
    },
    content: { padding: 24 },
    groupLabel: {
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: 0.2,
      color: "rgba(203,213,225,0.85)",
      marginBottom: 8,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
    },
    row: { display: "grid", gap: 12, marginTop: 14 },
    labelRow: { marginTop: 14, marginBottom: 6 },
    input: {
      width: "100%",
      height: 44,
      borderRadius: 12,
      border: "1px solid rgba(100,116,139,0.25)",
      padding: "0 14px",
      fontSize: 14,
      outline: "none",
      color: "rgba(226,232,240,0.95)",
      background:
        "linear-gradient(180deg, rgba(2,6,23,0.65), rgba(2,6,23,0.55))",
      transition: "box-shadow 140ms, border-color 140ms, background 140ms",
    } as React.CSSProperties,
    inputFocus: {
      boxShadow: "0 0 0 3px rgba(99,102,241,0.35)",
      borderColor: "rgba(99,102,241,0.65)",
      background:
        "linear-gradient(180deg, rgba(2,6,23,0.75), rgba(2,6,23,0.65))",
    },
    button: {
      width: "100%",
      height: 46,
      border: "1px solid rgba(99,102,241,0.35)",
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 700,
      color: "#fff",
      cursor: "pointer",
      background:
        "linear-gradient(90deg, rgb(59,130,246) 0%, rgb(139,92,246) 100%)",
      boxShadow: "0 10px 26px rgba(99,102,241,0.35)",
      transition: "transform 120ms, filter 120ms, box-shadow 120ms",
    } as React.CSSProperties,
    buttonHover: {
      filter: "brightness(1.05)",
      boxShadow: "0 14px 34px rgba(99,102,241,0.45)",
    },
    error: {
      marginTop: 8,
      fontSize: 13,
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(239,68,68,0.35)",
      background: "rgba(239,68,68,0.10)",
      color: "rgb(248,113,113)",
    },
    footer: {
      textAlign: "center" as const,
      marginTop: 18,
      fontSize: 12,
      color: "rgba(148,163,184,0.75)",
    },
  };

  const [focusU, setFocusU] = useState(false);
  const [focusP, setFocusP] = useState(false);
  const [hoverBtn, setHoverBtn] = useState(false);

  return (
    <div style={styles.page}>
      <div style={styles.bg} />
      <div style={styles.overlay} />

      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.iconWrap}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" style={{opacity:0.95}}>
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 21V3" />
              </svg>
            </div>
            <h1 style={styles.title}>HR Portal — Login</h1>
            <p style={styles.subtitle}>Access your account to continue</p>
          </div>

          <div style={styles.splitLine} />

          <div style={styles.content}>
            <form onSubmit={submit}>
              {/* Username */}
              <div style={styles.labelRow}>
                <span style={styles.groupLabel}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
                    <path d="M6 21a8 8 0 1 1 12 0" />
                  </svg>
                  Username
                </span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  className="loginDarkInput"
                  id="username"
                  type="text"
                  value={u}
                  onChange={(e) => setU(e.target.value)}
                  onFocus={() => setFocusU(true)}
                  onBlur={() => setFocusU(false)}
                  autoComplete="username"
                  required
                  placeholder="Enter your username"
                  style={{ ...styles.input, ...(focusU ? styles.inputFocus : {}) }}
                />
              </div>

              {/* Password */}
              <div style={styles.labelRow}>
                <span style={styles.groupLabel}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                  </svg>
                  Password
                </span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  className="loginDarkInput"
                  id="password"
                  type="password"
                  value={p}
                  onChange={(e) => setP(e.target.value)}
                  onFocus={() => setFocusP(true)}
                  onBlur={() => setFocusP(false)}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  style={{ ...styles.input, ...(focusP ? styles.inputFocus : {}) }}
                />
              </div>

              {msg && <div style={styles.error}>{msg}</div>}

              <div style={{ marginTop: 18 }}>
                <button
                  type="submit"
                  disabled={loading}
                  onMouseEnter={() => setHoverBtn(true)}
                  onMouseLeave={() => setHoverBtn(false)}
                  style={{
                    ...styles.button,
                    ...(hoverBtn ? styles.buttonHover : {}),
                    opacity: loading ? 0.9 : 1,
                    transform: loading ? "scale(0.995)" : "none",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.95 }}>
                      <path d="M10 17l5-5-5-5" />
                      <path d="M15 12H3" />
                    </svg>
                    {loading ? "Signing in..." : "Login"}
                  </span>
                </button>
              </div>
            </form>

            <div style={styles.footer}>© 2025 HR Portal. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
