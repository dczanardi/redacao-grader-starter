// scripts/backfill-owner-email.js
/* eslint-disable */

require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { Pool } = require("pg");

function pickConn() {
  return (
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.PRISMA_DATABASE_URL
  );
}

async function main() {
  const connectionString = pickConn();
  if (!connectionString) {
    console.error(
      "ERRO: Não achei string de conexão. Preciso de uma destas env vars: DATABASE_URL / POSTGRES_URL / PRISMA_DATABASE_URL (ou *_NON_POOLING)."
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  const before = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN owner_email IS NULL OR owner_email = '' THEN 1 ELSE 0 END)::int AS sem_owner_email
    FROM reports;
  `);
  console.log("Before:", before.rows[0]);

  const upd = await pool.query(`
    UPDATE reports
    SET owner_email = LOWER(
      CASE
        WHEN COALESCE(student_identifier,'') LIKE '%@%' THEN student_identifier
        WHEN COALESCE(student_name,'') LIKE '%@%' THEN student_name
        ELSE owner_email
      END
    )
    WHERE (owner_email IS NULL OR owner_email = '')
      AND (
        COALESCE(student_identifier,'') LIKE '%@%'
        OR COALESCE(student_name,'') LIKE '%@%'
      );
  `);
  console.log("Updated rows:", upd.rowCount);

  const after = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN owner_email IS NULL OR owner_email = '' THEN 1 ELSE 0 END)::int AS sem_owner_email
    FROM reports;
  `);
  console.log("After:", after.rows[0]);

  await pool.end();
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});