/** مشترك بين /api/snapchat/oauth/start و/callback — اسم الـcookie المؤقت
 * لقيمة state (حماية CSRF)، بلا استيراد بين ملفي route.ts نفسيهما. */
export const SNAPCHAT_OAUTH_STATE_COOKIE = "snapchat_oauth_state";
