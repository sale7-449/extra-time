import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/auth/isAdmin";
import { saveSnapchatTokens } from "@/lib/providers/snapchat/business-token-store";
import { SNAPCHAT_OAUTH_STATE_COOKIE } from "@/lib/providers/snapchat/oauth-constants";

/**
 * Callback من Snapchat بعد موافقة صاحب حساب "Extra Time" — يستبدل code
 * بـaccess_token/refresh_token حقيقيين ويخزّنهما سيرفر-فقط (راجع
 * business-token-store.ts)، ثم يُعيد توجيه المتصفح **بلا أي token في
 * الرابط أو الاستجابة إطلاقاً** — فقط كلمة حالة عامة (connected/error...).
 */

const TOKEN_URL = "https://accounts.snapchat.com/login/oauth2/access_token";
const RETURN_PATH = "/admin/content";

function redirectWithStatus(request: NextRequest, status: string) {
  const url = new URL(RETURN_PATH, request.url);
  url.searchParams.set("snapchat", status);
  const response = NextResponse.redirect(url);
  response.cookies.delete(SNAPCHAT_OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  // فحص Admin مستقل هنا أيضاً — لا نثق أن /start وحده كافٍ لحماية هذا
  // المسار، فقد يصل طلب إليه مباشرة من أي مصدر.
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(SNAPCHAT_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return redirectWithStatus(request, "state_mismatch");
  }

  const clientId = process.env.SNAPCHAT_CLIENT_ID;
  const clientSecret = process.env.SNAPCHAT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithStatus(request, "not_configured");
  }

  const redirectUri = new URL("/api/snapchat/oauth/callback", request.url).toString();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return redirectWithStatus(request, "error");
  }

  if (!tokenResponse.ok) {
    return redirectWithStatus(request, "error");
  }

  const data = (await tokenResponse.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!data.access_token || !data.refresh_token) {
    return redirectWithStatus(request, "error");
  }

  try {
    await saveSnapchatTokens(data.access_token, data.refresh_token, data.expires_in ?? 3600);
  } catch {
    return redirectWithStatus(request, "storage_error");
  }

  return redirectWithStatus(request, "connected");
}
