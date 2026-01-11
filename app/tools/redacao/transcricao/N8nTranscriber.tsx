"use client";

import React, { useMemo, useState } from "react";

import type { Dispatch, SetStateAction } from "react";

type Props = {
  setRedacaoText: Dispatch<SetStateAction<string>>;
  onTranscribed?: () => void;
  disabled?: boolean; // ✅ novo
};


function extractText(payload: string) {
  // 1) tenta JSON { text: "..." } ou { data: { text: "..." } } etc.
  try {
    const obj = JSON.parse(payload);
    const candidates = [
      obj?.text,
      obj?.data?.text,
      obj?.result?.text,
      obj?.output?.text,
      obj?.transcription?.text,
    ];
    const found = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
    if (found) return found.trim();
  } catch {
    // 2) se não for JSON, segue como texto puro
  }
  return (payload || "").trim();
}

export default function N8nTranscriber({ setRedacaoText, onTranscribed, disabled }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const transcribeDisabled = !!disabled;

  const canTranscribe = useMemo(() => !!file && !loading && !text, [file, loading, text]);

 async function handleTranscribe() {
  setError("");
  setRawResponse("");
  if (transcribeDisabled) {
  setError("Sem cotas de transcrição — compre créditos para transcrever.");
  return;
}

  // Se já existe uma transcrição pronta, não permite transcrever de novo
  // (evita "5 transcrições" com 1 crédito)
  if (text && text.trim().length > 0) {
    setError("Você já transcreveu 1 vez. Clique em “Inserir na Redação” para usar o texto.");
    return;
  }

  setText("");


    if (!file) {
      setError("Selecione um arquivo (imagem ou PDF) para transcrever.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file, file.name);

      // Chamada DIRETA ao webhook do n8n (embed sem popup)
      const res = await fetch("https://dczanardi.app.n8n.cloud/webhook/corretor-redacao", {
        method: "POST",
        body: form,
      });

      const payload = await res.text();
      setRawResponse(payload);

      if (!res.ok) {
        throw new Error(`Falha na transcrição (HTTP ${res.status}). Resposta: ${payload}`);
      }

      const extracted = extractText(payload);
      if (!extracted) {
        throw new Error("O n8n respondeu, mas não veio texto transcrito (campo 'text' vazio).");
      }
      setText(extracted);
    } catch (e: any) {
      // Erros comuns: CORS, tamanho, webhook offline, etc.
      setError(e?.message || "Erro desconhecido ao transcrever.");
    } finally {
      setLoading(false);
    }
  }

  function handleInsert() {
    if (!text) return;

    // Insere no campo principal da redação (sem digitar e-mail, sem popup)
onTranscribed?.();

setRedacaoText((prev: string) => {
  const prevStr = (prev || "");
  const prevTrim = prevStr.trim();
  const txtTrim = (text || "").trim();

  if (!txtTrim) return prevStr;
  if (!prevTrim) return txtTrim;

  // evita duplicar se clicar duas vezes
  if (prevStr.includes(txtTrim)) return prevStr;

  return `${prevStr}\n\n${txtTrim}`;
});
    // ✅ limpa o transcritor depois de inserir o texto na redação
    setText("");
    setFile(null);
    setRawResponse("");
    setError("");
  }

  const boxStyle: React.CSSProperties = {
    border: "2px dashed #2b4c47",
    borderRadius: 16,
    padding: 16,
    background: "#f3f6f6",
    opacity: transcribeDisabled ? 0.55 : 1,
    transition: "opacity 120ms ease",
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 800,
    fontSize: 18,
    marginBottom: 8,
  };

  const smallStyle: React.CSSProperties = {
    fontSize: 13,
    lineHeight: 1.35,
    margin: "6px 0 10px 0",
    color: "#1f2b2a",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%",
    border: "none",
    borderRadius: 10,
    padding: "12px 12px",
    fontWeight: 800,
    cursor: canTranscribe ? "pointer" : "not-allowed",
    opacity: canTranscribe ? 1 : 0.6,
    background: "#245d52",
    color: "#ffffff",
  };

  const btnInsertStyle: React.CSSProperties = {
    width: "100%",
    border: "none",
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 800,
    cursor: text ? "pointer" : "not-allowed",
    opacity: text ? 1 : 0.6,
    background: "#1d3f8b",
    color: "#ffffff",
    marginTop: 10,
  };

  const previewStyle: React.CSSProperties = {
    marginTop: 12,
    borderRadius: 12,
    border: "1px solid #cdd6d5",
    background: "#ffffff",
    padding: 10,
    maxHeight: 220,
    overflow: "auto",
    whiteSpace: "pre-wrap",
    fontSize: 13,
  };

  const errorStyle: React.CSSProperties = {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    background: "#fff2f2",
    border: "1px solid #f1b5b5",
    color: "#8a1f1f",
    fontSize: 13,
    whiteSpace: "pre-wrap",
  };

  return (
    <div style={boxStyle}>
      <div style={titleStyle}>Transcrição de redação manuscrita</div>

      <div style={smallStyle}>
        1. Selecione uma imagem (JPG/PNG) ou PDF. <br />
        2. Clique em <b>Transcrever Redação</b>. <br />
        3. Revise o texto e clique em <b>⬇️ Inserir na Redação</b>.
      </div>

      <input
        type="file"
        accept="image/*,.pdf"
        disabled={transcribeDisabled || loading}
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ width: "100%", marginBottom: 10 }}
      />

<button
  onClick={handleTranscribe}
  style={btnStyle}
  disabled={transcribeDisabled || !canTranscribe}
>
  {transcribeDisabled ? "Sem cotas de transcrição" : loading ? "Carregando..." : "Transcrever Redação"}
</button>


      <button onClick={handleInsert} style={btnInsertStyle} disabled={!text}>
        ⬇️ Inserir na Redação
      </button>

      {!!text && (
        <div style={previewStyle}>
          <b>Prévia do texto transcrito:</b>
          {"\n\n"}
          {text}
        </div>
      )}

      {!!error && <div style={errorStyle}>{error}</div>}

      {/* Debug opcional (mantém “profissional”: só aparece se der ruim e você quiser ver a resposta crua) */}
      {!!rawResponse && !text && (
        <div style={{ ...previewStyle, marginTop: 10 }}>
          <b>Resposta bruta (debug):</b>
          {"\n\n"}
          {rawResponse}
        </div>
      )}
    </div>
  );
}