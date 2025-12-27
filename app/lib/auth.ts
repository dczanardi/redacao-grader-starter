// app/lib/auth.ts
import { createHmac, timingSafeEqual } from "crypto";

type SessionPayload = { e: string; exp: number; products?: string[] };

function base64urlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}
function base64urlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function hmacSHA256(data: string, secret: string) {
return createHmac("sha256", secret).update(data).digest("base64url");
}

export function isEmailAllowed(email: string) {
  const raw = process.env.ALLOWED_EMAILS || "";
  const allowed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.trim().toLowerCase());
}

export function signSession(email: string) {
  const secret = process.env.AUTH_SECRET || "";
  if (!secret) throw new Error("AUTH_SECRET não configurado.");

  // sessão de 30 dias
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;

  const payload: SessionPayload = { e: email.trim().toLowerCase(), exp };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const sig = hmacSHA256(payloadB64, secret);

  return `${payloadB64}.${sig}`;
}

function getAllowedProductsForEmail(email: string): string[] {
  // Formato da env:
  // ALLOWED_PRODUCTS="email1@x.com:redacao,quimica;email2@y.com:redacao"
  const raw = (process.env.ALLOWED_PRODUCTS || "").trim();
  if (!raw) return [];

  const target = email.trim().toLowerCase();
  const entries = raw.split(";").map(s => s.trim()).filter(Boolean);

  for (const entry of entries) {
    const [mail, prods] = entry.split(":").map(s => (s || "").trim());
    if (!mail || !prods) continue;

    if (mail.toLowerCase() === target) {
      return prods
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    }
  }
  return [];
}

export function verifySessionPayload(cookieHeader: string): SessionPayload | null {
  try {
// 1) Pegar o token: pode vir como HEADER inteiro ("...; dcz_session=...; ...")
//    OU pode vir como o TOKEN puro (quando alguém passa cookies().get(...).value)
let token = "";

// Caso A: veio o header inteiro (ou uma string com vários cookies)
if (cookieHeader.includes(";") || cookieHeader.includes("dcz_session=")) {
  token =
    cookieHeader
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("dcz_session="))
      ?.slice("dcz_session=".length) || "";
} else {
  // Caso B: veio o token puro
  token = (cookieHeader || "").trim();
}

if (!token) return null;

    // 2) JWT: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;

    // 3) Verificar assinatura (HMAC)
    const secret = process.env.AUTH_SECRET || "";
    if (!secret) return null;

    const expected = hmacSHA256(`${headerB64}.${payloadB64}`, secret);

    const a = Buffer.from(sigB64, "base64url");
    const b = Buffer.from(expected, "base64url");

    if (a.length !== b.length) return null;

    // (cast só para o TypeScript não implicar com Buffer)
    if (!timingSafeEqual(a as unknown as Uint8Array, b as unknown as Uint8Array)) return null;

    // 4) Decodificar payload e validar exp
    const payload = JSON.parse(base64urlDecode(payloadB64)) as SessionPayload;

    if (!payload?.e || !payload?.exp) return null;
    if (Date.now() > payload.exp) return null;

    // 5) Anexar produtos permitidos
    payload.products = getAllowedProductsForEmail(payload.e);

    return payload;
  } catch {
    return null;
  }
}
// helper: extrai um cookie pelo nome
function getCookieValue(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const hit = cookies.find((c) => c.startsWith(name + "="));
  if (!hit) return null;
  return decodeURIComponent(hit.slice(name.length + 1));
}

// Mantém compatibilidade: quem usa verifySession continua recebendo só o email.
export function verifySession(cookieHeader: string): string | null {
  const payload = verifySessionPayload(cookieHeader);
  return payload?.e ?? null;
}

