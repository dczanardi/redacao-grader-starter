// /app/api/auth/login/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isEmailAllowed, signSession } from "@/app/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const emailRaw = String(form.get("email") || "").trim().toLowerCase();

  if (!emailRaw || !emailRaw.includes("@")) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }

  if (!isEmailAllowed(emailRaw)) {
    return NextResponse.json(
      { error: "Este e-mail não está autorizado." },
      { status: 403 }
    );
  }

  const token = signSession(emailRaw);

  // importante: cookie Secure só funciona em https
  const isHttps = new URL(req.url).protocol === "https:";

  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set({
    name: "dcz_session",
    value: token,
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  });

  return res;
}