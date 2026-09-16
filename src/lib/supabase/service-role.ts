import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * عميل Supabase بصلاحية service_role — يتجاوز RLS بالكامل. **حصراً لكود
 * سيرفر معزول** (Route Handlers هنا فقط عملياً) — لا يجوز استيراده أبداً من
 * أي ملف "use client" أو من أي كود قد يصل لحزمة المتصفح. المفتاح نفسه
 * (`SUPABASE_SERVICE_ROLE_KEY`) لا يُقرأ إلا هنا، ولا يُستخدَم متغيّر
 * `NEXT_PUBLIC_*` له إطلاقاً (لن يظهر في browser bundle بحكم تصميم Next.js
 * لمتغيّرات بلا بادئة NEXT_PUBLIC_، طالما بقي الاستيراد محصوراً سيرفر-فقط).
 *
 * null إن لم يُضبَط المتغيّر بعد — لا افتراض قيمة، ولا كسر لبقية الموقع.
 */
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceRoleKey) return null;

  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
