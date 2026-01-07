require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const url = process.env.POSTGRES_URL;

  if (!url) {
    console.error("ERRO: POSTGRES_URL não está definida. Confira o arquivo .env na raiz.");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  // 1) adiciona a coluna owner_email (se já existir, não dá erro)
  await client.query(`
    ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS owner_email TEXT;
  `);

  // 2) índice (opcional, mas recomendado)
  await client.query(`
    CREATE INDEX IF NOT EXISTS reports_owner_email_idx
    ON reports(owner_email);
  `);

  // 3) backfill: se student_identifier tiver email, usa como owner_email
  await client.query(`
    UPDATE reports
    SET owner_email = student_identifier
    WHERE owner_email IS NULL
      AND student_identifier LIKE '%@%';
  `);

  await client.end();
  console.log("OK: coluna owner_email criada (ou já existia) + backfill executado.");
}

main().catch((err) => {
  console.error("ERRO rodando db-add-owner-email:", err);
  process.exit(1);
});