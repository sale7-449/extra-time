/**
 * قبول الرابط ≠ جلب محتواه. هذه الدالة تتحقّق فقط أن النص رابط http/https
 * صالح الشكل — بلا أي whitelist لمواقع أو مصادر — وتُعيده كما أدخله المسؤول
 * (بعد trim فقط، بلا إعادة كتابة/تطبيع). لا تفتح اتصالاً ولا تقرأ شيئاً؛ أي
 * جلب فعلي لمحتوى الرابط يمرّ حصراً عبر safe-fetch.ts (حماية SSRF).
 *
 * تمنع بقية البروتوكولات (javascript:/data:/file:/ftp:...) لأن الرابط المحفوظ
 * قد يُعرَض لاحقاً كـ<a href> على الموقع العام.
 */
const MAX_URL_LENGTH = 2048;

export function parseHttpUrl(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value || value.length > MAX_URL_LENGTH) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return value;
  } catch {
    return null;
  }
}
