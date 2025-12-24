// app/api/reports/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PRISMA_DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING,
});

export async function GET(req: Request) {
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