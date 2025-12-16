// app/lib/db.ts
import { Pool } from "pg";

let _pool: Pool | null = null;

function getPool() {
  if (_pool) return _pool;

  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing POSTGRES_URL (or DATABASE_URL) environment variable.");
  }

  _pool = new Pool({
    connectionString: url,
    // Prisma Postgres / serverless costuma exigir SSL
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

  return _pool;
}

export async function ensureReportsTable() {
  const pool = getPool();

  // cria extensão + tabela + índices (idempotente)
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),

      student_name text,
      student_identifier text,

      rubric text NOT NULL,
      score_total integer,
      score_scale_max integer,

      allowed_to_share boolean NOT NULL,
      report_html text NOT NULL,

      model_used text
    );

    CREATE INDEX IF NOT EXISTS reports_created_at_idx
      ON reports (created_at DESC);

    CREATE INDEX IF NOT EXISTS reports_student_identifier_idx
      ON reports (student_identifier);

    CREATE INDEX IF NOT EXISTS reports_allowed_to_share_idx
      ON reports (allowed_to_share);
  `);
}

export async function insertReport(row: {
  student_name?: string | null;
  student_identifier?: string | null;
  rubric: string;
  score_total?: number | null;
  score_scale_max?: number | null;
  allowed_to_share: boolean;
  report_html: string;
  model_used?: string | null;
}) {
  const pool = getPool();

  const res = await pool.query(
    `
    INSERT INTO reports
      (student_name, student_identifier, rubric, score_total, score_scale_max, allowed_to_share, report_html, model_used)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING id
    `,
    [
      row.student_name ?? null,
      row.student_identifier ?? null,
      row.rubric,
      row.score_total ?? null,
      row.score_scale_max ?? null,
      row.allowed_to_share,
      row.report_html,
      row.model_used ?? null,
    ]
  );

  return res.rows[0]?.id as string;
}