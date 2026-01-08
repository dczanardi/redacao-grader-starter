// app/api/reports/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Pool } from "pg";
import { verifySessionPayload } from "../../lib/auth";

function splitEmails(raw: string) {
  return raw
    .split(/[,\n\r\s]+/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}


const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PRISMA_DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING,
});

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
const payload = verifySessionPayload(cookieHeader);

if (!payload) return NextResponse.json({ ok: false }, { status: 401 });

const email = String(payload.e || "").toLowerCase();
const url = new URL(req.url);
const scope = url.searchParams.get("scope"); // "all" => admin
const adminListRaw = process.env.ADMIN_EMAILS ?? process.env.ALLOWED_EMAILS ?? "";
const adminEmails = splitEmails(adminListRaw);
const isAdmin = email && adminEmails.includes(email);


  try {
    const { searchParams } = new URL(req.url);

    // Limite (padrão 50; máx 200)
    const limitRaw = Number(searchParams.get("limit") || "50");
    const limit = Math.min(Math.max(limitRaw, 1), 200);

    // Busca simples (nome / identificador / rubrica)
    const q = String(searchParams.get("q") || "").trim();

    // Filtro opcional: só compartilháveis
    // Padrão: NÃO filtra (mostra true e false)
    const onlyShareableParam = String(searchParams.get("onlyShareable") || "")
      .trim()
      .toLowerCase();

    const onlyShareable =
      onlyShareableParam === "1" ||
      onlyShareableParam === "true" ||
      onlyShareableParam === "sim";

    const whereParts: string[] = [];
    const params: any[] = [];

    // só aplica filtro se onlyShareable = true
    if (onlyShareable) {
      params.push(true);
      whereParts.push(`allowed_to_share = $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      whereParts.push(
        `(COALESCE(student_name,'') ILIKE ${p} OR COALESCE(student_identifier,'') ILIKE ${p} OR COALESCE(rubric,'') ILIKE ${p})`
      );
    }

    // filtro de dono (meus relatórios) — só libera "all" para admin
if (scope === "all") {
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
} else {
  // usuário comum: vê apenas os próprios relatórios
  params.push(email);
  whereParts.push(`owner_email = $${params.length}`);
}

    const whereSQL = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    // lista leve (não traz report_html)
    params.push(limit);
    const limitParam = `$${params.length}`;

    const sql = `
      SELECT
        id,
        student_name,
        student_identifier,
        rubric,
        score_total,
        score_scale_max,
        allowed_to_share,
        model_used,
        created_at
      FROM reports
      ${whereSQL}
      ORDER BY created_at DESC
      LIMIT ${limitParam};
    `;

    const r = await pool.query(sql, params);

    return NextResponse.json({
      ok: true,
      count: r.rows.length,
      items: r.rows,
    });
  } catch (e: any) {
    console.error("[reports:list] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Falha ao listar relatórios" },
      { status: 500 }
    );
  }
}