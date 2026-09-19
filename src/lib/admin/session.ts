import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_OPTIONS,
  ADMIN_SESSION_TTL_MS,
  getAdminSecret,
  signAdminToken,
  verifyAdminToken,
} from "@/lib/admin/admin-token";

/**
 * جلسة مسؤول مستقلة تماماً عن Supabase Auth — cookie موقَّع بـHMAC، لا يعتمد
 * على `signInWithPassword` ولا على أي جدول/جلسة Supabase. صالحة لحساب
 * المسؤول الواحد الذي يُنشَأ عبر /admin/setup.
 *
 * مستمرة: cookie بمسار "/" (الموقع كله) وعمر 30 يوماً يتجدد تلقائياً مع
 * النشاط عبر middleware.ts — لا ترتبط بالبقاء داخل /admin، وتنتهي فقط بتسجيل
 * خروج Admin (أو بعد 30 يوماً بلا أي زيارة).
 *
 * يتطلّب ADMIN_SESSION_SECRET في بيئة السيرفر — بدونه، لا جلسة يمكن
 * إنشاؤها أو التحقق منها (فشل آمن، لا افتراض قيمة).
 */

export async function createAdminSession(username: string): Promise<void> {
  const secret = getAdminSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");

  const token = await signAdminToken({ username, expiresAt: Date.now() + ADMIN_SESSION_TTL_MS }, secret);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, ADMIN_COOKIE_OPTIONS);
}

export async function getAdminSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const data = await verifyAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value, getAdminSecret());
  return data ? { username: data.username } : null;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: ADMIN_COOKIE_NAME, path: ADMIN_COOKIE_OPTIONS.path });
}
