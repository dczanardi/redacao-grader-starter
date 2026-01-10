// app/api/mp/webhook/route.ts
import { NextResponse } from "next/server";
import { addCredits } from "@/app/lib/credits";

export async function POST(req: Request) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: false }, { status: 500 });

  const url = new URL(req.url);
  const topic = url.searchParams.get("topic") || url.searchParams.get("type");

  const dataId =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    url.searchParams.get("payment_id");

  // Responde rápido sempre (MP odeia ficar esperando)
  if (!dataId) return NextResponse.json({ ok: true });

  try {
    // 1) Descobrir o paymentId real
    let paymentId: string | number | null = null;

    if (topic === "merchant_order") {
      const moRes = await fetch(
        `https://api.mercadopago.com/merchant_orders/${dataId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const mo = await moRes.json().catch(() => null);
      if (!moRes.ok || !mo) return NextResponse.json({ ok: true });

      // tenta achar um pagamento aprovado; se não achar, pega o primeiro
      const approved = (mo.payments || []).find((p: any) => p?.status === "approved");
      paymentId = approved?.id ?? mo?.payments?.[0]?.id ?? null;
    } else {
      // topic=payment (ou qualquer outro que já venha com payment id)
      paymentId = dataId;
    }

    if (!paymentId) return NextResponse.json({ ok: true });

    // 2) Buscar detalhes do pagamento
    const payRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const pay = await payRes.json().catch(() => null);
    if (!payRes.ok || !pay) return NextResponse.json({ ok: true });

    // 3) Só creditar quando aprovado
    if (pay.status !== "approved") return NextResponse.json({ ok: true });

    // 4) Pegar email/qty do metadata; se não vier, usar fallback
    const md = pay.metadata || {};

    const emailFromMd = String(md.email || "").toLowerCase().trim();
    const emailFromPayer = String(pay?.payer?.email || "").toLowerCase().trim();

    const email = emailFromMd || emailFromPayer;

    // qty: tenta metadata; se não vier, tenta ler do external_reference: redacao|email|qty|timestamp
    let qty = Number(md.qty || 1);
    if (!Number.isFinite(qty) || qty <= 0) qty = 1;

    const ext = String(pay.external_reference || "");
    if (ext.includes("|")) {
      const parts = ext.split("|");
      const maybeQty = Number(parts?.[2]);
      if (Number.isFinite(maybeQty) && maybeQty > 0) qty = maybeQty;
    }

    if (!email) return NextResponse.json({ ok: true });

    // 5) Creditar: 1 crédito = 1 redação + 1 transcrição
    await addCredits(email, "redacao", qty);
    await addCredits(email, "transcricao", qty);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}