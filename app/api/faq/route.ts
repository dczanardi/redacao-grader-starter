import { NextResponse } from "next/server";

const N8N_FAQ_URL = "https://dczanardi.app.n8n.cloud/webhook/faq-plataforma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const pergunta = body?.pergunta;

    if (!pergunta || typeof pergunta !== "string") {
      return NextResponse.json(
        { error: "Campo 'pergunta' inválido." },
        { status: 400 }
      );
    }

    const upstream = await fetch(N8N_FAQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta }),
      cache: "no-store",
    });

    // n8n pode devolver JSON ou texto; tratamos os dois
    const raw = await upstream.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }

    const text =
      (data && typeof data.text === "string" && data.text) ||
      (typeof raw === "string" ? raw : "");

    if (!upstream.ok) {
      return NextResponse.json(
        { error: text || "Erro ao consultar o n8n." },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ text: text || "" });
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao consultar o servidor de dúvidas." },
      { status: 500 }
    );
  }
}