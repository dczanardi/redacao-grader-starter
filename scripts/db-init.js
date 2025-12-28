const { Client } = require("pg");

async function main() {
  const url = process.env.POSTGRES_URL;

  if (!url) {
    console.error("ERRO: POSTGRES_URL não está definida. Confira o arquivo .env na raiz.");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });

  await client.connect();

  // Tabela simples de créditos por e-mail e produto
  await client.query(`
    create table if not exists product_credits (
      email text not null,
      product text not null,
      credits_remaining int not null default 0,
      updated_at timestamptz not null default now(),
      primary key (email, product)
    );
  `);

  // Índice auxiliar (opcional, mas ajuda)
  await client.query(`
    create index if not exists idx_product_credits_email
    on product_credits (email);
  `);

  await client.end();
  console.log("OK: tabela product_credits criada (ou já existia).");
}

main().catch((err) => {
  console.error("ERRO rodando db-init:", err);
  process.exit(1);
});