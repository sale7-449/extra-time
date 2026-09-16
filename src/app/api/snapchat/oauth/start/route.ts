import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/auth/isAdmin";
import { SNAPCHAT_OAUTH_STATE_COOKIE } from "@/lib/providers/snapchat/oauth-constants";

/**
 * يبدأ ربط حساب Snapchat Public Profile ("Extra Time") بالمنصة — إداري
 * حصراً (راجع isCurrentUserAdmin)، لا علاقة له بمشاركة أي مستخدم عادي.
 * المرحلة الحالية: ربط OAuth فقط، لا نشر فعلي بعد.
 *
 * scope مُستخدَم هنا: "snapchat-profile-api" فقط — النطاق الوحيد المؤكَّد
 * من توثيق Snap الرسمي لـPublic Profile API (لا نطاق إضافي مُخمَّن).
 */

const AUTHORIZE_URL = "https://accounts.snapchat.com/login/oauth2/authorize";
const SCOPE = "snapchat-profile-api";

export async function GET(request: NextRequest) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = process.env.SNAPCHAT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Snapchat OAuth is not configured" }, { status: 500 });
  }

  // مبني من نفس الطلب الحالي دائماً — يطابق تلقائياً الـRedirect URI
  // المسجَّل في Snapchat Business Dashboard عند التشغيل على Production
  // الحقيقي، بلا حاجة لمتغيّر بيئة إضافي لقيمة غير حسّاسة أصلاً.
  const redirectUri = new URL("/api/snapchat/oauth/callback", request.url).toString();

  // state عشوائي وآمن تشفيرياً (32 بايت) — حماية CSRF قياسية لتدفّق OAuth.
  const state = randomBytes(32).toString("hex");

  const authorizeUrl = new URL(AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", SCOPE);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set(SNAPCHAT_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/snapchat/oauth",
  });
  return response;
}
