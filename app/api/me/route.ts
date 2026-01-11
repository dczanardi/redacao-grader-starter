// app/api/me/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifySessionPayload } from "../../lib/auth";
import { getCreditsRemaining } from "@/app/lib/credits";

function splitEmails(raw: string) {
  return raw
    .split(/[,\n;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const payload = verifySessionPayload(cookieHeader);

  if (!payload) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

const email = payload.e;
const adminRaw = process.env.ADMIN_EMAILS || "";
const isAdmin = splitEmails(adminRaw).includes(String(email || "").toLowerCase());

const payloadProducts =
  Array.isArray(payload.products) && payload.products.length
    ? payload.products
    : [];

// Sempre expõe estes dois na UI:
const products = Array.from(new Set([...payloadProducts, "redacao", "transcricao"]));


// Busca créditos de cada produto (ex.: "redacao")
const creditsByProduct = Object.fromEntries(
  await Promise.all(
    products.map(async (p: string) => [p, await getCreditsRemaining(email, p)])
  )
);

return NextResponse.json({
  ok: true,
  email,
  isAdmin,
  products,
  credits: creditsByProduct,
});
}