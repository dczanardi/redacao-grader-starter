"use client";

import React, { useEffect, useRef, useState } from "react";

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
};

const WEBHOOK_URL = "https://dczanardi.app.n8n.cloud/webhook/faq-plataforma";

export default function N8nHelpWidget() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Olá! Tire suas dúvidas sobre créditos, relatórios, transcrição e uso geral da plataforma. 🙂",
    },
  ]);

  // ✅ Esse é o “userText” no seu código: aqui chama `input`
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  // rola pro final quando chegam mensagens
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function sendMessage() {
    const pergunta = input.trim();
    if (!pergunta) return;

    // 1) BLOQUEIO antes de enviar = travar input/botão para não clicar 2x
    setLoading(true);

    // 2) Mostra a pergunta do usuário na tela imediatamente
    setMessages((prev) => [...prev, { role: "user", content: pergunta }]);

    // 3) Limpa o campo depois que enviou com sucesso (na prática, assim que disparou)
    setInput("");

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // 4) Ler a resposta do servidor
      const data: unknown = await res.json();

      // Esperado: { "text": "..." }
      const text =
        typeof data === "object" &&
        data !== null &&
        "text" in data &&
        typeof (data as any).text === "string"
          ? (data as any).text
          : "";

      if (!text) {
        throw new Error("Resposta sem campo .text");
      }

      // 5) Mostra a resposta da IA
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Ops! Não consegui conversar com o servidor de dúvidas agora.\n\nSe isso persistir, abra o Console do navegador (F12 → Console) e me diga qual erro aparece lá.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* LISTA DE MENSAGENS */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          background: "rgba(255,255,255,0.92)",
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "10px 12px",
                borderRadius: 12,
                whiteSpace: "pre-wrap",
                background: m.role === "user" ? "#15a389" : "rgba(0,0,0,0.06)",
                color: m.role === "user" ? "white" : "black",
                fontSize: 15,
                lineHeight: 1.35,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ fontSize: 14, opacity: 0.7, padding: "6px 2px" }}>
            Respondendo…
          </div>
        )}
      </div>

      {/* INPUT + BOTÃO */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: 12,
          borderTop: "1px solid rgba(0,0,0,0.08)",
          background: "rgba(255,255,255,0.98)",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Digite sua dúvida aqui…"
          style={{
            flex: 1,
            padding: "12px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            outline: "none",
          }}
          disabled={loading} // ✅ bloqueio do campo enquanto responde
        />

        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()} // ✅ bloqueio do botão enquanto responde/sem texto
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: "none",
            background: "#15a389",
            color: "white",
            fontWeight: 800,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.6 : 1,
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}