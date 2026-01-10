// app/api/mp/webhook/route.ts
import { NextResponse } from "next/server";
import { addCredits } from "@/app/lib/credits";

// --- DB (pg Pool) - singleton para evitar criar pool a cada request ---
const globalForPg = globalThis as unknown as { pgPool?: Pool };

function getPool() {
  if (globalForPg.pgPool) return globalForPg.pgPool;

  const connectionString =
    process.env.PRISMA_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing database connection string (PRISMA_DATABASE_URL/POSTGRES_URL/DATABASE_URL).");
  }

  globalForPg.pgPool = new Pool({
    connectionString,
    // Prisma Postgres / serverless costuma exigir SSL
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  return globalForPg.pgPool;
}

// ✅ COLE AQUI A MESMA LINHA DE IMPORT DO `sql` QUE VOCÊ VIU EM app/lib/credits.ts
import { Pool } from "pg";

async function ensureMpTable() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mp_processed_payments (
      payment_id TEXT PRIMARY KEY,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function markAsProcessed(paymentId: string) {
  const pool = getPool();
  const r = await pool.query(
    `
    INSERT INTO mp_processed_payments (payment_id)
    VALUES ($1)
    ON CONFLICT (payment_id) DO NOTHING
    RETURNING payment_id;
    `,
    [paymentId]
  );

  // se não retornou nada, é porque já tinha sido processado
  return r.rowCount === 1;
}

export async function POST(req: Request) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: false }, { status: 500 });

  const url = new URL(req.url);

  // MP pode mandar "type" ou "topic"
  const type = url.searchParams.get("type") || url.searchParams.get("topic") || "";

  // MP manda ids em formatos diferentes
  const dataId =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    url.searchParams.get("payment_id") ||
    "";

  // sempre responde rápido
  if (!dataId) return NextResponse.json({ ok: true });

  try {
    // garante tabela (1x, e nas próximas é instantâneo)
    await ensureMpTable();

    let paymentIds: string[] = [];

    // 1) Se veio como payment, o id já é do pagamento
    if (type === "payment") {
      paymentIds = [String(dataId)];
    }

    // 2) Se veio como merchant_order, precisamos buscar quais pagamentos estão dentro dela
    if (type === "merchant_order") {
      const moRes = await fetch(`https://api.mercadopago.com/merchant_orders/${dataId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const mo = await moRes.json().catch(() => null);

      const ids =
        mo?.payments?.map((p: any) => String(p?.id || "")).filter((x: string) => !!x) || [];

      paymentIds = ids;
    }

    // Se não reconheceu o type, não faz nada (evita crédito errado)
    if (paymentIds.length === 0) return NextResponse.json({ ok: true });

    // Processa cada payment id (com trava anti-duplicação)
    for (const pid of paymentIds) {
      // trava: se já processou esse payment id, não credita de novo
      const firstTime = await markAsProcessed(pid);
      if (!firstTime) continue;

      // busca detalhes do pagamento
      const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${pid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pay = await payRes.json().catch(() => null);

      if (!payRes.ok || !pay) continue;

      // só credita se aprovado
      if (pay.status !== "approved") continue;

      const md = pay.metadata || {};
      const email = String(md.email || "").toLowerCase().trim();
      const qty = Number(md.qty || 1);

      if (!email || !Number.isFinite(qty) || qty <= 0) continue;

      // 1 crédito = 1 redação + 1 transcrição (sempre junto)
      await addCredits(email, "redacao", qty);
      await addCredits(email, "transcricao", qty);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}