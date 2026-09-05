import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/** عميل السيرفر (Server Components / Server Actions / Route Handlers).
 * null إن لم يكن Supabase مُهيَّأً — كل استدعاء يجب أن يتحقق من ذلك أولاً. */
export async function createClient() {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // يُستدعى أحياناً من Server Component لا يملك صلاحية الكتابة —
          // آمن التجاهل هنا لأن middleware.ts يتكفّل بتحديث الجلسة فعلياً.
        }
      },
    },
  });
}
