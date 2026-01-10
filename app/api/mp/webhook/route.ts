// app/api/mp/webhook/route.ts
import { NextResponse } from "next/server";
import { addCredits } from "@/app/lib/credits";

export async function POST(req: Request) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: false }, { status: 500 });

  // Mercado Pago pode mandar params diferentes
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || url.searchParams.get("topic");
  const dataId =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    url.searchParams.get("payment_id");

  // Sempre responder 200 rápido (pra MP não ficar re-tentando agressivo)
  // Mas a gente tenta processar se tiver dataId
  if (!dataId) return NextResponse.json({ ok: true });

  try {
    // buscar detalhes do pagamento
    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pay = await payRes.json().catch(() => null);

    if (!payRes.ok || !pay) return NextResponse.json({ ok: true });

    // só credita quando aprovado
    if (pay.status !== "approved") return NextResponse.json({ ok: true });

    const md = pay.metadata || {};
    const email = String(md.email || "").toLowerCase().trim();
    const product = String(md.product || "redacao").trim();
    const qty = Number(md.qty || 1);

    if (!email || !product || !Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ ok: true });
    }

    // creditar no banco
    await addCredits(email, "redacao", qty);
    await addCredits(email, "transcricao", qty);


    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}