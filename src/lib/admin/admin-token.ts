/**
 * رمز جلسة Admin (HMAC-SHA256) — Web Crypto فقط بلا أي استيراد من node:* كي
 * يعمل بنفس الشيفرة في Server Actions/Components (Node) وفي middleware
 * (بغضّ النظر عن runtime). الصيغة `<payload-base64url>.<hex-signature>` ومحتوى
 * payload (`{username, expiresAt}`) لم يتغيّرا عمّا كان سابقاً، فالـcookie
 * الصادر قبل هذا التعديل يبقى صالحاً كما هو.
 */

export const ADMIN_COOKIE_NAME = "admin_session";

/** جلسة Admin مستمرة: تنتهي بعد 30 يوماً من آخر نشاط (تُجدَّد تلقائياً مع
 * كل زيارة، انظر ADMIN_REFRESH_AFTER_MS)، أو فوراً عند تسجيل خروج Admin. */
export const ADMIN_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** لا نُعيد إصدار الـcookie في كل طلب — فقط حين يمرّ عليه أكثر من ساعة منذ
 * آخر تجديد (يكفي لإبقائه "منزلقاً" دون Set-Cookie على كل صفحة). */
export const ADMIN_REFRESH_AFTER_MS = 60 * 60 * 1000;

export interface AdminSessionPayload {
  username: string;
  expiresAt: number;
}

const encoder = new TextEncoder();

export function getAdminSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

/** مقارنة بزمن ثابت — لا تُسرّب موضع أول اختلاف في التوقيع. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signAdminToken(data: AdminSessionPayload, secret: string): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(data)));
  return `${payload}.${await hmacHex(payload, secret)}`;
}

/** يتحقّق من التوقيع والانتهاء — null لأي رمز غير صالح (مزوَّر/منتهٍ/تالف). */
export async function verifyAdminToken(token: string | undefined, secret: string | null): Promise<AdminSessionPayload | null> {
  if (!token || !secret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = await hmacHex(payload, secret);
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as AdminSessionPayload;
    if (typeof data.username !== "string" || typeof data.expiresAt !== "number") return null;
    if (Date.now() > data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

/** true = الرمز صالح لكن مضى عليه أكثر من ADMIN_REFRESH_AFTER_MS منذ آخر تجديد
 * (أو أُصدر بمدة قديمة أقصر) — يستحق إصداراً جديداً بانتهاء ممتد. */
export function shouldRefreshAdminToken(data: AdminSessionPayload, now = Date.now()): boolean {
  return data.expiresAt - now < ADMIN_SESSION_TTL_MS - ADMIN_REFRESH_AFTER_MS;
}

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: ADMIN_SESSION_TTL_MS / 1000,
  // "/" صراحةً: الجلسة تغطي الموقع كله (لا /admin وحده) كي لا تختفي
  // صلاحية Admin بمجرد الانتقال لأي صفحة عامة ثم العودة.
  path: "/",
};
