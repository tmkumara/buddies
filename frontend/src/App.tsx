import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchMe, login, logout } from "./features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "./hooks";

type HealthResponse = { status: string };

export default function App() {
  const dispatch = useAppDispatch();
  const { token, user, status, error, checking } = useAppSelector((state) => state.auth);
  const [statusText, setStatusText] = useState<string>("(not checked)");
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string>("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isAuthenticated = Boolean(token && user);
  const busy = status === "loading" || checking;

  useEffect(() => {
    if (token && !user && !checking) {
      dispatch(fetchMe());
    }
  }, [token, user, checking, dispatch]);

  const rolesLabel = useMemo(() => {
    if (!user?.roles?.length) return "No roles";
    return user.roles.join(", ");
  }, [user]);

  async function checkHealth() {
    setLoadingHealth(true);
    setHealthError("");
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as HealthResponse;
      setStatusText(data.status);
    } catch (e: any) {
      setHealthError(e?.message ?? "Unknown error");
    } finally {
      setLoadingHealth(false);
    }
  }

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch(login({ email, password }));
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__eyebrow">Gift Box OMS</p>
          <h1>Authentication Dashboard</h1>
        </div>
        <button className="ghost" onClick={checkHealth} disabled={loadingHealth}>
          {loadingHealth ? "Checking..." : "Check backend"}
        </button>
      </header>

      <section className="card">
        <div className="card__row">
          <div>
            <h2>API Health</h2>
            <p className="muted">Confirm the API is reachable before signing in.</p>
          </div>
          <div className="status-pill">
            <span>Status</span>
            <strong>{statusText}</strong>
          </div>
        </div>
        {healthError && <p className="error">{healthError}</p>}
      </section>

      <div className="grid">
        <section className="card">
          <h2>Sign in</h2>
          <p className="muted">Use your credentials to request a JWT.</p>
          <form className="form" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? "Signing in..." : "Login"}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </section>

        <section className="card">
          <div className="card__row">
            <div>
              <h2>Session</h2>
              <p className="muted">JWT and RBAC details resolved from the database.</p>
            </div>
            <button className="ghost" onClick={() => dispatch(logout())} disabled={!token}>
              Logout
            </button>
          </div>
          {isAuthenticated ? (
            <div className="session">
              <div>
                <span className="label">User</span>
                <strong>{user?.email}</strong>
              </div>
              <div>
                <span className="label">Roles</span>
                <strong>{rolesLabel}</strong>
              </div>
              <div>
                <span className="label">Token</span>
                <span className="mono">Stored in localStorage</span>
              </div>
            </div>
          ) : (
            <p className="muted">Sign in to see your active session and roles.</p>
          )}
        </section>
      </div>
    </div>
  );
}
