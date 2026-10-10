"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "./use-lab";
export function Owner() {
  const router = useRouter();
  const [state, setState] = useState<{
      configured: boolean;
      authenticated: boolean;
    }>(),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    fetchJson<{ configured: boolean; authenticated: boolean }>("/api/auth")
      .then(setState)
      .catch((e) => setError(e.message));
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetchJson("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setPassword("");
      router.push("/knowledge");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main>
      <span className="eyebrow">ACCESS / VERIFIED SESSION</span>
      <h1>Owner access</h1>
      <div className="panel">
        {state?.authenticated ? (
          <>
            <p>Verified owner session active.</p>
            <button
              onClick={async () => {
                await fetchJson("/api/auth", { method: "DELETE" });
                window.location.reload();
              }}
            >
              Sign out
            </button>
          </>
        ) : state?.configured ? (
          <form onSubmit={login}>
            <label>
              Owner password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                maxLength={512}
              />
            </label>
            <button className="primary">Sign in</button>
          </form>
        ) : (
          <p>
            Owner access is unavailable in this public demonstration.
            Administrative operations are blocked by the server.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
