import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** يُستدعى من روابط تأكيد البريد وإعادة تعيين كلمة المرور التي يرسلها
 * Supabase — يستبدل الرمز المؤقت بجلسة فعلية عبر Cookies. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
