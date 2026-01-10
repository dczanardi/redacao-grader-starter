// /app/api/mp/webhook/route.ts
import { NextResponse } from "next/server";
import { addCredits } from "@/app/lib/credits";
import { Pool } from "pg";

export const runtime = "nodejs";


// 1) Pega a URL do Postgres (tenta várias, porque depende do setup)
const DB_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

// 2) Reaproveita pool entre execuções (evita abrir conexão toda hora)
const globalForPg = globalThis as unknown as { mpPool?: Pool };
const pool =
  globalForPg.mpPool ??
  new Pool({
    connectionString: DB_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPg.mpPool = pool;

// 3) Cria a tabela de trava automaticamente (sem Prisma / sem SQL manual)
async function ensureMpTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mp_processed_payments (
      payment_id TEXT PRIMARY KEY,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

// 4) Marca pagamento como “processado” (idempotência)
// Retorna true se foi a primeira vez; false se já existia.
async function markAsProcessed(paymentId: string): Promise<boolean> {
  const r = await pool.query(
    `
    INSERT INTO mp_processed_payments (payment_id)
    VALUES ($1)
    ON CONFLICT (payment_id) DO NOTHING;
  `,
    [paymentId]
  );
  return r.rowCount === 1;
}

async function fetchMpJson(url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

async function processPaymentId(paymentId: string) {
  // Busca detalhes do pagamento
  const { res: payRes, data: pay } = await fetchMpJson(
    `https://api.mercadopago.com/v1/payments/${paymentId}`
  );
  if (!payRes.ok || !pay) return;

  // Só credita quando aprovado
  if (pay.status !== "approved") return;

  // Trava: se já processou esse paymentId, não faz nada
  const firstTime = await markAsProcessed(paymentId);
  if (!firstTime) return;

  const md = pay.metadata || {};
  const email = String(md.email || "").toLowerCase().trim();
  const qty = Number(md.qty || 1);

  if (!email || !Number.isFinite(qty) || qty <= 0) return;

  // Você está creditando 2 produtos por compra (redacao + transcricao).
  // Se isso for intencional, mantém assim.
  await addCredits(email, "redacao", qty);
  await addCredits(email, "transcricao", qty);
}

export async function POST(req: Request) {
  if (!token) return NextResponse.json({ ok: false }, { status: 500 });
  if (!DB_URL) return NextResponse.json({ ok: false }, { status: 500 });

  const url = new URL(req.url);
  const topic = url.searchParams.get("topic") || url.searchParams.get("type");

  const dataId =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    url.searchParams.get("payment_id");

  // Sempre responde 200 rápido para o MP não “martelar”
  if (!dataId) return NextResponse.json({ ok: true });

  try {
    await ensureMpTable();

    // Se veio merchant_order, precisamos converter para paymentId
    if (topic === "merchant_order") {
      const { res: moRes, data: mo } = await fetchMpJson(
        `https://api.mercadopago.com/merchant_orders/${dataId}`
      );
      if (!moRes.ok || !mo) return NextResponse.json({ ok: true });

      const payments = Array.isArray(mo.payments) ? mo.payments : [];

      // Processa só os payments aprovados (se tiver mais de um, processa todos)
  for (const p of payments) {
  const pid = String(p?.id || "");
  if (pid) {
    await processPaymentId(pid);
  }
}


      return NextResponse.json({ ok: true });
    }

    // Caso contrário, trata como payment
    await processPaymentId(String(dataId));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}