// app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("email", email);

      const res = await fetch("/api/auth/login", { method: "POST", body: fd });

      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      const txt = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(txt);
      } catch {}

      setMsg(data?.error || txt || "Falha no login.");
    } catch (err: any) {
      setMsg(err?.message || "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 40, marginBottom: 8 }}>Entrar</h1>
      <p style={{ marginBottom: 16 }}>Digite seu e-mail para acessar.</p>

      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seuemail@..."
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 8 }}
        >
          {loading ? "..." : "Entrar"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}