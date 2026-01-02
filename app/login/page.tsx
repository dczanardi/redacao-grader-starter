"use client";

import { useMemo, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/tools/redacao";
    const p = new URLSearchParams(window.location.search).get("next");
    return p || "/tools/redacao";
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("email", email.trim().toLowerCase());

      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      // tenta ler JSON (tanto no sucesso quanto no erro)
      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        setError(data?.error ? String(data.error) : "Falha no login.");
        return;
      }

      // sucesso → vai para o destino
      window.location.href = nextPath;
    } catch {
      setError("Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 820, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Entrar</h1>
      <p style={{ color: "#444", marginTop: 0 }}>Digite seu e-mail para acessar.</p>

      <form onSubmit={onSubmit} style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          name="email"
          type="email"
          placeholder="seu@email.com"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            fontSize: 16,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 16,
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {error ? <p style={{ marginTop: 10, color: "#b00020" }}>{error}</p> : null}
    </main>
  );
}