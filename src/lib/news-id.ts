/**
 * معرّف الخبر الحقيقي (`source-link`) يحوي شرطات مائلة وعلامات استفهام
 * حقيقية (رابط المصدر الأصلي كاملاً) — تبيّن بالاختبار الفعلي أن تمريره
 * حتى بعد encodeURIComponent داخل مقطع مسار [id] ديناميكي واحد غير موثوق
 * (Next.js لا يُعيد بناءه بشكل موثوق دائماً عبر %2F المُشفَّرة)، فكانت صفحة
 * الخبر تُظهر "غير موجود" لأخبار حقيقية موجودة فعلاً. Base64url خالٍ تماماً
 * من "/"و"?"و"&"و":" يتفادى المشكلة جذرياً بدل تصحيح الترميز مرة أخرى.
 * btoa/atob متاحتان عالمياً (خادم ومتصفح) بلا حاجة لـBuffer (غير متاح في
 * حِزمة العميل لمكوّن "use client").
 */
export function encodeNewsId(id: string): string {
  return btoa(encodeURIComponent(id)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** يُعيد null بصمت لأي مُدخَل مشوَّه (رابط كُتب يدوياً، معرّف قديم غير
 * متوافق) بدل رمي استثناء يُسقط الصفحة بخطأ 500 — يُعامَل كـ"غير موجود"
 * صادق (404) في صفحة الخبر، تماماً كخبر انتهت صلاحيته من التخزين المؤقت. */
export function decodeNewsId(encoded: string): string | null {
  try {
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    return decodeURIComponent(atob(base64));
  } catch {
    return null;
  }
}
