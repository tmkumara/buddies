import { useState } from "react";

type HealthResponse = { status: string };

export default function App() {
  const [status, setStatus] = useState<string>("(not checked)");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function checkHealth() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as HealthResponse;
      setStatus(data.status);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Gift Box OMS</h1>

      <button onClick={checkHealth} disabled={loading}>
        {loading ? "Checking..." : "Check backend"}
      </button>

      <div style={{ marginTop: 16 }}>
        <div>
          <b>Status:</b> {status}
        </div>
        {error && (
          <div style={{ marginTop: 8, color: "crimson" }}>
            <b>Error:</b> {error}
          </div>
        )}
      </div>
    </div>
  );
}
