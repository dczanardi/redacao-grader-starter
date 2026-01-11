// app/api/transcricao/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifySessionPayload } from "../../lib/auth";
import { consumeOneCredit, refundOneCredit } from "@/app/lib/credits";

const N8N_URL =
  process.env.N8N_TRANSCRIBE_WEBHOOK_URL ||
  "https://dczanardi.app.n8n.cloud/webhook/corretor-redacao";

function extractText(payload: string) {
  try {
    const obj = JSON.parse(payload);

    const candidates = [
      obj?.text,
      obj?.data?.text,
      obj?.result?.text,
      obj?.output?.text,
    ];

    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c.trim();
    }

    // fallback: procura qualquer campo "text" no objeto
    const stack: any[] = [obj];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || typeof cur !== "object") continue;
      for (const k of Object.keys(cur)) {
        const v = (cur as any)[k];
        if (k === "text" && typeof v === "string" && v.trim()) return v.trim();
        if (v && typeof v === "object") stack.push(v);
      }
    }
  } catch {
    // se não for JSON, segue
  }

  return (payload || "").trim();
}

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const payload = verifySessionPayload(cookieHeader);

  if (!payload?.e) {
    return NextResponse.json({ ok: false, error: "Não logado." }, { status: 401 });
  }

  const email = payload.e;

  // 1) Debita 1 cota de transcrição NO BANCO (aqui está o bug que faltava)
  const okConsume = await consumeOneCredit(email, "transcricao");
  if (!okConsume) {
    return NextResponse.json({ ok: false, error: "Sem cotas de transcrição." }, { status: 402 });
  }

  // 2) Recebe o arquivo
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    await refundOneCredit(email, "transcricao");
    return NextResponse.json({ ok: false, error: "Arquivo não enviado." }, { status: 400 });
  }

  // 3) Encaminha para o n8n (server->server, sem CORS)
  try {
    const forward = new FormData();
    // @ts-ignore
    forward.append("file", file, (file as any).name || "upload");

    const res = await fetch(N8N_URL, { method: "POST", body: forward });
    const raw = await res.text();

    if (!res.ok) {
      await refundOneCredit(email, "transcricao");
      return NextResponse.json(
        { ok: false, error: `Falha no n8n (HTTP ${res.status}).`, raw },
        { status: 502 }
      );
    }

    const text = extractText(raw);
    if (!text) {
      await refundOneCredit(email, "transcricao");
      return NextResponse.json(
        { ok: false, error: "O n8n respondeu, mas não veio texto transcrito.", raw },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, text });
  } catch (e: any) {
    await refundOneCredit(email, "transcricao");
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro ao chamar n8n." },
      { status: 502 }
    );
  }
}