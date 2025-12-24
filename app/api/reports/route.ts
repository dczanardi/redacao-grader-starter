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
    const q = (searchParams.get("q") || "").trim(); // nome OU identificador
    const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

    const params: any[] = [];
    let where = "";

    if (q) {
      params.push(q);
      where = `WHERE student_identifier = $1 OR student_name = $1`;
    }

    const sql = `
      SELECT
        id,
        student_name,
        student_identifier,
        rubric,
        score_total,
        score_scale_max,
        allowed_to_share,
        created_at,
        model_used
      FROM reports
      ${where}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;

    const r = await pool.query(sql, params);
    return NextResponse.json({ ok: true, reports: r.rows });
  } catch (e: any) {
    console.error("[reports] list error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Falha ao listar relatórios" },
      { status: 500 }
    );
  }
}