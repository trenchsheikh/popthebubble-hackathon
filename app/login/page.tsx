"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!email.trim() || !password) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Sign in failed.");
      router.push("/studio");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <span className="landing-brand">
          <Sparkles size={18} /> Bubble
        </span>
        <h1>Sign in as a Restaurant</h1>
        <p className="auth-sub">
          Use your email and a password. First time? Just pick a password — it&apos;ll be saved for next time.
        </p>

        <label className="auth-field">
          <Mail size={16} />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@restaurant.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
        </label>
        <label className="auth-field">
          <Lock size={16} />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button className="primary-button" onClick={submit} disabled={busy || !email.trim() || !password}>
          {busy ? <Loader2 size={18} className="spin" /> : null}
          {busy ? "Signing in…" : "Sign in / Create account"}
        </button>
      </div>
    </main>
  );
}
