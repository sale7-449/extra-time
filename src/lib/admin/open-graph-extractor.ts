import { decodeEntities } from "@/lib/providers/news/rss-parser";

/**
 * استخراج بيانات عامة من رابط خارجي عبر وسوم Open Graph فقط — لا تسجيل
 * دخول، لا تجاوز حماية/paywall، لا "scraping عدواني" (طلب HTML واحد فقط،
 * بلا زحف لصفحات إضافية). كل حقل هنا إمّا مُستخرَج فعلياً من الصفحة نفسها
 * أو null صريح — لا اختلاق قيمة غائبة بأي شكل.
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 512 * 1024; // نصف ميغابايت يكفي دائماً لوسوم <head> — لا حاجة لتنزيل الصفحة كاملة.
const USER_AGENT = "Mozilla/5.0 (compatible; ExtraTimeBot/1.0)";

export interface OpenGraphResult {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  canonicalUrl: string;
  /** حقول لم تُوجَد في الصفحة — للعرض الصريح للمستخدم، لا للإخفاء. */
  warnings: Array<"no_title" | "no_description" | "no_image">;
}

export type OpenGraphOutcome = { data: OpenGraphResult } | { error: "invalid_url" | "blocked_host" | "fetch_failed" };

/**
 * حماية أولى ضد SSRF: رفض أي مضيف يشير صراحة لشبكة محلية/خاصة قبل أي
 * محاولة اتصال. فحص نصي على اسم/عنوان المضيف كما كُتب في الرابط — **لا
 * يحلّ DNS للتحقق من العنوان الفعلي**، فرابط عام الشكل يُحيل عبر DNS Rebinding
 * لعنوان خاص لن يُكتَشف هنا (قيد معروف، موثَّق في التقرير المرفق لا مخفيّاً).
 */
function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h.endsWith(".local")) return true;

  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 127 || a === 0 || a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // بما فيه عنوان بيانات اعتماد السحابة الشهير 169.254.169.254
  }
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;

  return false;
}

async function fetchHtmlCapped(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(contentType)) throw new Error("not html");

    if (!response.body) return await response.text();

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (received >= MAX_BYTES) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
  } finally {
    clearTimeout(timeout);
  }
}

function extractMetaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${escaped}["']`, "i"),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match) {
      const value = decodeEntities(match[1]).trim();
      if (value) return value;
    }
  }
  return null;
}

/** بيانات بنيوية (schema.org JSON-LD) — تُستخدَم فقط لتعويض حقل لم توفّره
 * وسوم Open Graph، لا لتجاوزها؛ نفس مبدأ "استخرج ما يمكن إثباته فقط". */
function extractJsonLdFallback(html: string): { title?: string; description?: string; image?: string } {
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const scriptMatch of scripts) {
    try {
      const parsed: unknown = JSON.parse(scriptMatch[1]);
      const obj = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!obj || typeof obj !== "object") continue;
      const record = obj as Record<string, unknown>;

      const title = typeof record.headline === "string" ? record.headline : typeof record.name === "string" ? record.name : undefined;
      const description = typeof record.description === "string" ? record.description : undefined;
      const rawImage = record.image;
      const image =
        typeof rawImage === "string"
          ? rawImage
          : Array.isArray(rawImage) && typeof rawImage[0] === "string"
            ? (rawImage[0] as string)
            : rawImage && typeof rawImage === "object" && typeof (rawImage as Record<string, unknown>).url === "string"
              ? ((rawImage as Record<string, unknown>).url as string)
              : undefined;

      if (title || description || image) return { title, description, image };
    } catch {
      continue;
    }
  }
  return {};
}

function resolveUrl(value: string, base: URL): string | null {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

export async function extractOpenGraph(rawUrl: string): Promise<OpenGraphOutcome> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { error: "invalid_url" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { error: "invalid_url" };
  if (isPrivateOrLocalHost(parsed.hostname)) return { error: "blocked_host" };

  let html: string;
  try {
    html = await fetchHtmlCapped(parsed.toString());
  } catch {
    return { error: "fetch_failed" };
  }

  const ogTitle = extractMetaContent(html, "og:title");
  const ogDescription = extractMetaContent(html, "og:description");
  const ogImage = extractMetaContent(html, "og:image");
  const ogUrl = extractMetaContent(html, "og:url");

  const needsFallback = !ogTitle || !ogDescription || !ogImage;
  const jsonLd = needsFallback ? extractJsonLdFallback(html) : {};

  const title = ogTitle ?? jsonLd.title ?? null;
  const description = ogDescription ?? jsonLd.description ?? null;
  const rawImage = ogImage ?? jsonLd.image ?? null;
  const imageUrl = rawImage ? resolveUrl(rawImage, parsed) : null;
  const canonicalUrl = (ogUrl && resolveUrl(ogUrl, parsed)) || parsed.toString();

  const warnings: OpenGraphResult["warnings"] = [];
  if (!title) warnings.push("no_title");
  if (!description) warnings.push("no_description");
  if (!imageUrl) warnings.push("no_image");

  return { data: { title, description, imageUrl, canonicalUrl, warnings } };
}
