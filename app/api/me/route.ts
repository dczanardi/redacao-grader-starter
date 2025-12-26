// app/api/me/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifySessionPayload } from "../../lib/auth";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const payload = verifySessionPayload(cookieHeader);

  if (!payload) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    email: payload.e,
    products: payload.products || [],
  });
}