import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_OPTIONS,
  ADMIN_SESSION_TTL_MS,
  getAdminSecret,
  shouldRefreshAdminToken,
  signAdminToken,
  verifyAdminToken,
} from "@/lib/admin/admin-token";

/** صفحات /admin/* التي يجب أن تبقى متاحة بلا جلسة Admin (الدخول والإعداد
 * الأول) — أي مسار /admin آخر يتطلّب جلسة صالحة. */
function isPublicAdminPath(pathname: string): boolean {
  return ["/admin/login", "/admin/setup"].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** يُجدِّد جلسة Supabase في كل طلب (مطلوب من @supabase/ssr على Next.js).
 * إن لم تكن متغيّرات البيئة موجودة، لا يفعل شيئاً — الموقع العام يعمل
 * بشكل طبيعي تماماً بدون Supabase. */
async function refreshSupabaseSession(request: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = getAdminSecret();
  const admin = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value, secret);

  // حماية /admin/* على مستوى HTTP (307 حقيقي) قبل أي رسم — الحارس داخل
  // (protected)/layout.tsx يبقى كحماية ثانية، لكنه لا يستطيع إرجاع 307 بعد أن
  // تبدأ الصفحة بالبثّ (loading.tsx).
  // بلا سرّ مقروء في هذا runtime لا نستطيع التحقق هنا أصلاً — نتجاوز هذه الطبقة
  // فقط، وتبقى (protected)/layout.tsx وكل Server Action هما الحارس الحاسم (لا
  // فتح للوحة: كلاهما يرفض بلا جلسة موقَّعة صالحة).
  if (secret && (pathname === "/admin" || pathname.startsWith("/admin/")) && !isPublicAdminPath(pathname) && !admin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // مسؤول لديه جلسة فعّالة لا يحتاج صفحة الدخول — يُحوَّل مباشرة للوحة.
  if (admin && pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const response = await refreshSupabaseSession(request);

  // جلسة Admin منزلقة: كل تحميل صفحة (أي صفحة، لا /admin فقط) يمدّد انتهاء
  // الـcookie ما دام قد مضت ساعة على آخر تجديد. لا تُنشئ جلسة أبداً — فقط تُمدّد
  // جلسة موقَّعة وصالحة أصلاً. تحميلات المتصفح المستندية فقط (Sec-Fetch-Dest:
  // document): طلبات Server Actions (POST) وRSC/prefetch (fetch من الصفحة =
  // dest "empty") مستثناة عمداً كي لا يتعارض Set-Cookie التجديد مع حذف الـcookie
  // في adminLogoutAction (فيبقى الخروج نهائياً).
  const isDocumentRequest = request.method === "GET" && request.headers.get("sec-fetch-dest") === "document";
  if (admin && secret && isDocumentRequest && shouldRefreshAdminToken(admin)) {
    const token = await signAdminToken({ username: admin.username, expiresAt: Date.now() + ADMIN_SESSION_TTL_MS }, secret);
    response.cookies.set(ADMIN_COOKIE_NAME, token, ADMIN_COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
