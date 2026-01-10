// app/api/mp/create-preference/route.ts
import { NextResponse } from "next/server";
import { verifySessionPayload } from "@/app/lib/auth";

function getBaseUrl(req: Request) {
  // tenta pegar do env; se não tiver, usa o host da request
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "MERCADOPAGO_ACCESS_TOKEN não configurado." },
        { status: 500 }
      );
    }

    // usuário logado
    const cookieHeader = req.headers.get("cookie") || "";
    const payload = verifySessionPayload(cookieHeader);
    const email = String(payload?.e || "").toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // quantidade (1,3,5)
    const body = await req.json().catch(() => ({}));
    const qtyRaw = Number(body?.qty);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
    if (![1, 3, 5].includes(qty)) {
      return NextResponse.json(
        { error: "qty inválido. Use 1, 3 ou 5." },
        { status: 400 }
      );
    }

    // preços (você pode ajustar depois, mas já deixo pronto)
    // Aqui usei valores “placeholder”; você troca pelos seus valores finais.
    // Ex.: 1 crédito = 9,90; 3 créditos com desconto; 5 créditos com desconto.
    const priceMap: Record<number, number> = {
      1: 9.9,
      3: 26.9, // <- TROCAR
      5: 41.9, // <- TROCAR
    };

    const unitPrice = priceMap[qty];
    if (!unitPrice || unitPrice <= 0) {
      return NextResponse.json(
        {
          error:
            "Preço de 3 ou 5 créditos ainda não definido no servidor (priceMap).",
        },
        { status: 500 }
      );
    }

    const baseUrl = getBaseUrl(req);

    // metadata vai voltar no payment (pra gente creditar no webhook)
    const preferencePayload = {
      items: [
        {
          title: `Créditos Redação (${qty})`,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: "BRL",
        },
      ],
      metadata: {
        email,
        product: "redacao",
        qty,
      },
      external_reference: `redacao|${email}|${qty}|${Date.now()}`,
      back_urls: {
        success: `${baseUrl}/tools/redacao?pay=success`,
        pending: `${baseUrl}/tools/redacao?pay=pending`,
        failure: `${baseUrl}/tools/redacao?pay=failure`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/mp/webhook`,
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferencePayload),
    });

    const mpJson = await mpRes.json().catch(() => null);

    if (!mpRes.ok) {
      return NextResponse.json(
        { error: "Erro Mercado Pago ao criar preference.", details: mpJson },
        { status: 500 }
      );
    }

    // init_point é o link do Checkout Pro
    return NextResponse.json({
      init_point: mpJson?.init_point,
      sandbox_init_point: mpJson?.sandbox_init_point,
      id: mpJson?.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro desconhecido." },
      { status: 500 }
    );
  }
}
