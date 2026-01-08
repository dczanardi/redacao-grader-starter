// app/admin/reports/page.tsx
"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  student_name: string | null;
  student_identifier: string | null;
  rubric: string | null;
  score_total: number | null;
  score_scale_max: number | null;
  allowed_to_share: boolean | null;
  model_used: string | null;
  created_at: string;
};

export default function AdminReportsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/reports?scope=all&limit=50", { cache: "no-store" });

    if (res.status === 403) {
      setError("403 — Acesso negado (não é admin).");
      setItems([]);
      setLoading(false);
      return;
    }

    const data = await res.json().catch(() => null);

    if (!data?.ok) {
      setError(data?.error || "Falha ao carregar.");
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 36 }}>Admin — Relatórios (todos)</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Esta página lista todos os relatórios (somente admin).
      </p>

      <button
        onClick={load}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.2)",
          background: "white",
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        Recarregar
      </button>

      {loading && <div>Carregando…</div>}
      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.06)" }}>
              <th style={th}>Aluno</th>
              <th style={th}>Rubrica</th>
              <th style={th}>Nota</th>
              <th style={th}>Modelo</th>
              <th style={th}>Criado em</th>
              <th style={th}>Link</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td style={td} colSpan={6}>
                  Nenhum relatório.
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.student_name || r.student_identifier || "—"}</td>
                  <td style={td}>{r.rubric || "—"}</td>
                  <td style={td}>
                    {(r.score_total ?? 0)} / {(r.score_scale_max ?? 0)}
                  </td>
                  <td style={td}>{r.model_used || "—"}</td>
                  <td style={td}>{String(r.created_at).slice(0, 16).replace("T", " - ")}</td>
                  <td style={td}>
                    <a href={`/reports/${r.id}`} target="_blank" rel="noreferrer">
                      abrir
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid rgba(0,0,0,0.15)",
  fontWeight: 700,
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(0,0,0,0.12)",
};