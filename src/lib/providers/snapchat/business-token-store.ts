import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * تخزين/تجديد tokens ربط Snapchat Public Profile الخاص بالمنصة نفسها
 * ("Extra Time" على Snapchat) — **ليس** توكن أي مستخدم عادي. صف واحد ثابت
 * فقط (id = "extra_time"). سيرفر-فقط بالكامل: لا يُستورَد أبداً من أي ملف
 * "use client"، ولا يُطبَع/يُسجَّل أي token في أي console.log في هذا الملف
 * إطلاقاً — أي خطأ يُبلَّغ برسالة عامة فقط.
 *
 * الجدول (يُنشَأ عبر supabase/migrations/0002_snapchat_oauth.sql):
 * snapchat_oauth_tokens(id, access_token, refresh_token, expires_at, updated_at)
 * — RLS مفعَّل بلا أي سياسة، فلا وصول ممكن إلا عبر service_role هنا.
 */

const TABLE = "snapchat_oauth_tokens";
const ROW_ID = "extra_time";
const TOKEN_URL = "https://accounts.snapchat.com/login/oauth2/access_token";
// هامش أمان قبل الانتهاء الفعلي (دقيقتان) — يمنع استخدام access_token على
// وشك الانتهاء في نداء قد يستغرق لحظات.
const EXPIRY_SAFETY_MARGIN_MS = 2 * 60 * 1000;

interface TokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export async function saveSnapchatTokens(accessToken: string, refreshToken: string, expiresInSeconds: number): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) throw new Error("Supabase service role client is not configured");

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  const { error } = await supabase.from(TABLE).upsert({
    id: ROW_ID,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error("Failed to store Snapchat tokens");
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  const clientId = process.env.SNAPCHAT_CLIENT_ID;
  const clientSecret = process.env.SNAPCHAT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const data = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  // Snapchat قد يُعيد refresh_token جديداً أو لا — إن غاب، الأصلي يبقى صالحاً.
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? refreshToken, expiresIn: data.expires_in ?? 3600 };
}

/**
 * يُعيد access_token صالحاً الآن، ويُجدِّده تلقائياً عبر refresh_token عند
 * الحاجة. `null` إن لم يوجد ربط مُخزَّن أصلاً (OAuth لم يُنفَّذ بعد) أو فشل
 * التجديد — لا يُخترَع توكن، ولا يُطبَع أي شيء من محتواه في أي مكان.
 */
export async function getValidSnapchatAccessToken(): Promise<string | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data } = await supabase.from(TABLE).select("access_token, refresh_token, expires_at").eq("id", ROW_ID).maybeSingle<TokenRow>();
  if (!data) return null;

  const expiresAtMs = new Date(data.expires_at).getTime();
  if (Date.now() < expiresAtMs - EXPIRY_SAFETY_MARGIN_MS) {
    return data.access_token;
  }

  const refreshed = await refreshAccessToken(data.refresh_token);
  if (!refreshed) return null;

  await saveSnapchatTokens(refreshed.accessToken, refreshed.refreshToken, refreshed.expiresIn);
  return refreshed.accessToken;
}
