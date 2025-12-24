// app/lib/auth.ts
import crypto from "crypto";

type SessionPayload = { e: string; exp: number };

function base64urlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}
function base64urlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function hmacSHA256(data: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
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

export function verifySession(token: string | undefined | null) {
  if (!token) return null;

  const secret = process.env.AUTH_SECRET || "";
  if (!secret) return null;

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = hmacSHA256(payloadB64, secret);
  // comparação segura
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(payloadB64)) as SessionPayload;
    if (!payload?.e || !payload?.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload.e;
  } catch {
    return null;
  }
}