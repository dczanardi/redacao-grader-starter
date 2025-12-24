// app/api/reports/[id]/route.ts
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

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const id = String(ctx.params.id || "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "html").toLowerCase();

    const r = await pool.query(
      `SELECT id, report_html, allowed_to_share, created_at
       FROM reports
       WHERE id = $1
       LIMIT 1;`,
      [id]
    );

    if (!r.rows.length) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const row = r.rows[0];

    // Se quiser bloquear abertura quando não autorizado, descomente:
    // if (!row.allowed_to_share) {
    //   return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
    // }

    if (format === "json") {
      return NextResponse.json({ ok: true, report: row });
    }

    const html = String(row.report_html || "");
    return new NextResponse(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[reports:id] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Falha ao abrir relatório" },
      { status: 500 }
    );
  }
}