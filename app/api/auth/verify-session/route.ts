// /app/api/auth/verify-session/route.ts
import { NextResponse } from "next/server";
import { verifySession } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const result = verifySession(cookieHeader);

  // seu verifySession parece devolver o e-mail (string) quando ok
  const email = typeof result === "string" ? result : result ? "ok" : null;

  if (!email) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, email }, { status: 200 });
}