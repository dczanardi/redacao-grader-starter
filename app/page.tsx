// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 880, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Correção de Redação</h1>
      <p style={{ color: "#444", marginTop: 0 }}>
        Escolha uma das opções abaixo para começar:
      </p>

      <nav style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <Link
          href="/tools/redacao"
          style={{
            display: "block",
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            textDecoration: "none",
          }}
        >
          ➡️ <b>Abrir a ferramenta de correção</b>
          <div style={{ color: "#666", fontSize: 14 }}>
            Envie a proposta (texto ou imagem) e a redação (imagem/DOCX/TXT). Faça a transcrição se precisar
            e gere o relatório com nota final.
          </div>
        </Link>
      </nav>
    </main>
  );
}