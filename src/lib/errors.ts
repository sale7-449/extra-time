/**
 * نظام موحّد للتعامل مع أخطاء الخدمات الخارجية. لا يصل أي Stack Trace أو
 * مفتاح API أو خطأ داخلي للمستخدم أبداً — فقط رسالة عربية عامة عند الحاجة،
 * والتفاصيل الحقيقية تُسجَّل في السيرفر فقط عبر console.error.
 */
export async function safeResolve<T>(promise: Promise<T>, fallback: T, context: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[safe:${context}]`, error);
    return fallback;
  }
}
