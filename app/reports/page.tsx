"use client";

import { useEffect, useMemo, useState } from "react";

type ReportRow = {
  id: string;
  created_at: string;
  allowed_to_share: boolean;
  model_used: string | null;
  score_total: number | null;
  score_scale_max: number | null;
  student_name: string | null;
  student_identifier: string | null;
  rubric: string | null;
};

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [onlyShareable, setOnlyShareable] = useState(false);
  const [limit, setLimit] = useState(50);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (onlyShareable) p.set("onlyShareable", "true");
    p.set("limit", String(limit));
    return p.toString();
  }, [q, onlyShareable, limit]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/reports?${queryString}`, { cache: "no-store" });
      const txt = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(txt);
      } catch {
        // nada
      }
      if (!res.ok || !data?.ok) throw new Error(data?.error || txt);

      setRows(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ fontSize: 40, margin: "12px 0 8px" }}>Relatórios</h1>
      <p style={{ marginTop: 0, color: "#666" }}>
        Clique em <b>abrir</b> para visualizar o relatório renderizado.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "16px 0" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar (nome, identificador, rubrica)…"
          style={{ padding: "10px 12px", minWidth: 320, border: "1px solid #ccc", borderRadius: 8 }}
        />

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={onlyShareable}
            onChange={(e) => setOnlyShareable(e.target.checked)}
          />
          Só compartilháveis
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Limite:
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </label>

        <button
          onClick={load}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
            background: "white",
          }}
        >
          Recarregar
        </button>

        {loading ? <span style={{ color: "#666" }}>Carregando…</span> : null}
        {err ? <span style={{ color: "crimson" }}>Erro: {err}</span> : null}
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #e5e5e5", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Aluno</th>
              <th style={th}>Identificador</th>
              <th style={th}>Rubrica</th>
              <th style={th}>Nota</th>
              <th style={th}>Compartilhar</th>
              <th style={th}>Modelo</th>
              <th style={th}>Criado em</th>
              <th style={th}>Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={{ padding: 14, color: "#666" }} colSpan={8}>
                  Nenhum relatório encontrado.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.student_name ?? ""}</td>
                  <td style={td}>{r.student_identifier ?? ""}</td>
                  <td style={td}>{r.rubric ?? ""}</td>
                  <td style={td}>
                    {r.score_total ?? ""}{r.score_scale_max ? ` / ${r.score_scale_max}` : ""}
                  </td>
                  <td style={td}>{r.allowed_to_share ? "SIM" : "NÃO"}</td>
                  <td style={td}>{r.model_used ?? ""}</td>
                  <td style={td}>{r.created_at}</td>
                  <td style={td}>
                    <a href={`/api/reports/${r.id}`} target="_blank" rel="noreferrer">
                      abrir
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #eee",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #f2f2f2",
  verticalAlign: "top",
};