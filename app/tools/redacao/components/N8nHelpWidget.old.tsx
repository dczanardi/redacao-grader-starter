"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChat } from "@n8n/chat";

const CHAT_WEBHOOK_URL =
  "https://dczanardi.app.n8n.cloud/webhook/21ac93fc-ec39-425f-baec-d97cbb1b023d/chat";

export default function N8nHelpWidget() {
  const [open, setOpen] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }

    const t = setTimeout(() => {
      if (initializedRef.current) return;

      const host = document.getElementById("dcz-n8n-help-chat");
      if (!host) return;

      host.innerHTML = "";

      createChat({
        webhookUrl: CHAT_WEBHOOK_URL,

        // chaves esperadas pelo n8n chat trigger
        chatInputKey: "chatInput",
        chatSessionKey: "sessionId",

        // renderiza dentro do modal (sem botão flutuante)
        target: "#dcz-n8n-help-chat",
        mode: "fullscreen",

        initialMessages: [
          "Olá! Eu sou a IA de apoio da plataforma.",
          "Você pode perguntar sobre créditos, relatórios, transcrição e uso geral.",
        ],

        // O pulo do gato:
        // 1) colocamos PT-BR/PT
        // 2) repetimos em EN, porque às vezes a lib cai no fallback 'en'
        i18n: {
          "pt-BR": {
            title: "Tire suas dúvidas com a IA — DCZ-PE-IA",
            subtitle: "Pergunte sobre o uso da plataforma",
            inputPlaceholder: "Digite sua dúvida aqui...",
            getStarted: "Nova conversa",
            footer: "",
            closeButtonTooltip: "Fechar",
            openChatTooltip: "Abrir chat",
          },
          pt: {
            title: "Tire suas dúvidas com a IA — DCZ-PE-IA",
            subtitle: "Pergunte sobre o uso da plataforma",
            inputPlaceholder: "Digite sua dúvida aqui...",
            getStarted: "Nova conversa",
            footer: "",
            closeButtonTooltip: "Fechar",
            openChatTooltip: "Abrir chat",
          },
          en: {
            // fallback em inglês, mas com TEXTO EM PT
            title: "Tire suas dúvidas com a IA — DCZ-PE-IA",
            subtitle: "Pergunte sobre o uso da plataforma",
            inputPlaceholder: "Digite sua dúvida aqui...",
            getStarted: "Nova conversa",
            footer: "",
            closeButtonTooltip: "Fechar",
            openChatTooltip: "Abrir chat",
          },
        },
      });

      initializedRef.current = true;
    }, 50);

    return () => clearTimeout(t);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "14px 12px",
          borderRadius: 12,
          border: "2px solid rgba(255,255,255,0.55)",
          background: "rgba(255,255,255,0.25)",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Tire suas dúvidas com a IA
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(1100px, 98vw)",
              height: "min(720px, 92vh)",
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 800 }}>
                Tire suas dúvidas com a IA — DCZ-PE-IA
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <div
                id="dcz-n8n-help-chat"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}