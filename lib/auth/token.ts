// Signed session tokens: "<base64url payload>.<base64url HMAC-SHA256 signature>".
// Written with the Web Crypto API (no dependency), so it also runs inside proxy.ts.
// The token only carries the user id and an expiry; groups are looked up server-side on
// every request, so a cookie can never grant more than the user's current groups.

export const SESSION_COOKIE = "mindspace_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // session timeout: 8 hours

export interface SessionPayload {
  uid: string;
  exp: number; // unix seconds
}

const encoder = new TextEncoder();

function getKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in .env.local (see .env.example).");
  }
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function signToken(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await getKey("sign"), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns the payload if the signature is valid and the token has not expired, else null. */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length > 0) return null;
  try {
    // crypto.subtle.verify compares in constant time.
    const valid = await crypto.subtle.verify("HMAC", await getKey("verify"), fromBase64Url(signature), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AUTH_SECRET")) throw error;
    return null; // malformed token
  }
}
