// app/api/essay-grade/route.ts
// Rota antiga de correção — mantida apenas para compatibilidade.
// A correção oficial agora é feita em /api/grade2.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Esta rota antiga (/api/essay-grade) foi descontinuada. Use a ferramenta principal de correção (rota /api/grade2).",
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Rota antiga de correção desativada. A correção oficial agora usa /api/grade2.",
  });
}