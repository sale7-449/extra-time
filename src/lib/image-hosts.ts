/**
 * قائمة الاستضافات المسموح بها لصور next/image — مصدر وحيد للحقيقة
 * يُستخدم في next.config.ts (remotePatterns) وفي مكوّنات الصور التي تعرض
 * روابط قادمة من APIs خارجية (قد تُرجع مضيفاً غير مُدرَج بعد)، لتفادي
 * انهيار الصفحة كاملة عبر error boundary بسبب "Invalid src prop".
 */
/** مضيف Supabase Storage نفسه (نفس مشروع NEXT_PUBLIC_SUPABASE_URL) — لصور/
 * فيديوهات Content Studio المرفوعة من الجهاز إلى bucket content-media.
 * مُشتَق من متغيّر البيئة بدل تثبيت مرجع مشروع حرفياً هنا. */
const SUPABASE_STORAGE_HOST = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

export const REMOTE_IMAGE_HOSTS = [
  { hostname: "media.api-sports.io", note: "شعارات الأندية والبطولات القادمة من API-Football" },
  { hostname: "r2.thesportsdb.com", note: "شعارات ولاعبو TheSportsDB (مصدر بيانات ثانٍ)" },
  { hostname: "www.thesportsdb.com", note: "TheSportsDB — بعض الشعارات تُرجَع من المضيف الرئيسي لا CDN الـ r2" },
  { hostname: "ichef.bbci.co.uk", note: "صور أخبار BBC Sport (موجز RSS الحقيقي)" },
  { hostname: "a.espncdn.com", note: "شعارات وصور لاعبي ESPN (مصدر بيانات ثالث — إثراء الأحداث/الإحصائيات/التشكيلة)" },
  { hostname: "*.365dm.com", note: "Sky Sports (عدة عقد CDN e0/e1/e2...)" },
  { hostname: "i.guim.co.uk", note: "The Guardian" },
  { hostname: "static.independent.co.uk", note: "The Independent" },
  { hostname: "i2-prod.mirror.co.uk", note: "The Mirror" },
  { hostname: "cdnv.russiatoday.com", note: "RT Arabic" },
  { hostname: "*.ytimg.com", note: "صور مصغّرة لفيديوهات يوتيوب (قنوات رسمية)" },
  ...(SUPABASE_STORAGE_HOST
    ? [{ hostname: SUPABASE_STORAGE_HOST, note: "صور/فيديوهات Content Studio المرفوعة من الجهاز (Supabase Storage — bucket content-media)" }]
    : []),
] as const;

export function isAllowedImageHost(url: string | null | undefined): boolean {
  if (!url) return false;
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  return REMOTE_IMAGE_HOSTS.some(({ hostname: pattern }) =>
    pattern.startsWith("*.") ? hostname.endsWith(pattern.slice(1)) : hostname === pattern
  );
}
