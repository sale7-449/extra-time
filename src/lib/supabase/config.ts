export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** يُستخدم في كل مكان قبل أي عملية Supabase — الموقع العام يجب أن يعمل
 * كاملاً بدون هذين المتغيّرين (تسجيل الدخول/المفضلة تصبح غير متاحة فقط،
 * لا كسر لبقية المنصة). */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
