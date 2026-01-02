// /app/lib/credits.ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// Lê quantos créditos restam
export async function getCreditsRemaining(email: string, product: string): Promise<number> {
  const { rows } = await pool.query(
    `select credits_remaining
       from product_credits
      where email = $1 and product = $2`,
    [email, product]
  );

  return rows[0]?.credits_remaining ?? 0;
}

// Debita 1 crédito de forma atômica (evita corrida)
export async function consumeOneCredit(email: string, product: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `update product_credits
        set credits_remaining = credits_remaining - 1,
            updated_at = now()
      where email = $1
        and product = $2
        and credits_remaining > 0`,
    [email, product]
  );

  return rowCount === 1;
}
// Estorna 1 crédito (para usar se a correção falhar antes de entregar resultado)
export async function refundOneCredit(email: string, product: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `update product_credits
        set credits_remaining = credits_remaining + 1,
            updated_at = now()
      where email = $1
        and product = $2`,
    [email, product]
  );

  return rowCount === 1;
}