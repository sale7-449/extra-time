import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * جلسة مسؤول مستقلة تماماً عن Supabase Auth — cookie موقَّع بـHMAC، لا يعتمد
 * على `signInWithPassword` ولا على أي جدول/جلسة Supabase. صالحة لحساب
 * المسؤول الواحد الذي يُنشَأ عبر /admin/setup.
 *
 * يتطلّب ADMIN_SESSION_SECRET في بيئة السيرفر — بدونه، لا جلسة يمكن
 * إنشاؤها أو التحقق منها (فشل آمن، لا افتراض قيمة).
 */

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 ساعة

interface SessionPayload {
  username: string;
  expiresAt: number;
}

function getSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function createAdminSession(username: string): Promise<void> {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");

  const data: SessionPayload = { username, expiresAt: Date.now() + SESSION_TTL_MS };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = sign(payload, secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
}

export async function getAdminSession(): Promise<{ username: string } | null> {
  const secret = getSecret();
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload, secret);
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expectedSignature, "hex");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (Date.now() > data.expiresAt) return null;
    return { username: data.username };
  } catch {
    return null;
  }
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
