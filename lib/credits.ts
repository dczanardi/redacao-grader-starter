// /app/lib/credits.ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

/** Retorna o número de créditos restantes para (email, product). */
export async function getCreditsRemaining(email: string, product: string): Promise<number> {
  const { rows } = await pool.query(
    `select credits_remaining
     from product_credits
     where email = $1 and product = $2`,
    [email, product]
  );

  if (rows.length === 0) return 0;
  return Number(rows[0].credits_remaining ?? 0);
}

/**
 * Consome 1 crédito de forma segura:
 * - só decrementa se credits_remaining > 0
 * - retorna true se consumiu, false se não tinha crédito
 */
export async function consumeOneCredit(email: string, product: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const result = await client.query(
      `update product_credits
       set credits_remaining = credits_remaining - 1,
           updated_at = now()
       where email = $1
         and product = $2
         and credits_remaining > 0
       returning credits_remaining`,
      [email, product]
    );

    await client.query("commit");
    return result.rowCount === 1;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}