import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/** عميل المتصفح — يُستخدم فقط داخل مكوّنات "use client". null إن لم يكن
 * Supabase مُهيَّأً (لا مفتاح Service Role هنا مطلقاً، فقط المفتاح العام). */
export function createClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
}
