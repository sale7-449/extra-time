import { decodeEntities } from "@/lib/providers/news/rss-parser";
import { parseHttpUrl } from "@/lib/admin/http-url";
import { BlockedHostError, safeFetchHtml } from "@/lib/admin/safe-fetch";

/**
 * قراءة البيانات العامة المتاحة فعلاً في صفحة رابط خارجي — لا تسجيل دخول، لا
 * تجاوز حماية/paywall، لا "scraping عدواني" (طلب HTML واحد فقط بحدّ حجم
 * ووقت، بلا زحف لصفحات إضافية). كل حقل هنا إمّا مُستخرَج فعلياً من الصفحة
 * نفسها أو null صريح — لا اختلاق قيمة غائبة بأي شكل. الأولوية: وسوم Open
 * Graph، ثم Twitter Cards، ثم schema.org JSON-LD، ثم <title> ووصف meta
 * العاديَّين — كلها بيانات ظاهرة في الصفحة نفسها.
 *
 * قبول الرابط للتخزين مستقل تماماً عن هذا الجلب (انظر http-url.ts): فشل
 * الجلب لا يمنع حفظ الرابط، ويُكمل المسؤول الحقول يدوياً. حماية SSRF كاملة
 * داخل safe-fetch.ts.
 */

export interface OpenGraphResult {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  canonicalUrl: string;
  /** حقول لم تُوجَد في الصفحة — للعرض الصريح للمستخدم، لا للإخفاء. */
  warnings: Array<"no_title" | "no_description" | "no_image">;
}

export type OpenGraphOutcome = { data: OpenGraphResult } | { error: "invalid_url" | "blocked_host" | "fetch_failed" };

function extractMetaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, "i"),
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match) {
        const value = decodeEntities(match[1]).trim();
        if (value) return value;
      }
    }
  }
  return null;
}

function extractDocumentTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const value = decodeEntities(match[1]).replace(/\s+/g, " ").trim();
  return value || null;
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
    const resolved = new URL(value, base);
    // صورة/رابط بغير http(s) (data:, javascript:...) لا يُقبل كنتيجة استخراج.
    return resolved.protocol === "http:" || resolved.protocol === "https:" ? resolved.toString() : null;
  } catch {
    return null;
  }
}

export async function extractOpenGraph(rawUrl: string): Promise<OpenGraphOutcome> {
  const accepted = parseHttpUrl(rawUrl);
  if (!accepted) return { error: "invalid_url" };

  let html: string;
  let finalUrl: string;
  try {
    ({ html, finalUrl } = await safeFetchHtml(accepted));
  } catch (error) {
    return { error: error instanceof BlockedHostError ? "blocked_host" : "fetch_failed" };
  }
  const base = new URL(finalUrl);

  const ogTitle = extractMetaContent(html, ["og:title", "twitter:title"]);
  const ogDescription = extractMetaContent(html, ["og:description", "twitter:description"]);
  const ogImage = extractMetaContent(html, ["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"]);
  const ogUrl = extractMetaContent(html, ["og:url"]);

  const needsFallback = !ogTitle || !ogDescription || !ogImage;
  const jsonLd = needsFallback ? extractJsonLdFallback(html) : {};

  const title = ogTitle ?? jsonLd.title ?? extractDocumentTitle(html);
  const description = ogDescription ?? jsonLd.description ?? extractMetaContent(html, ["description"]);
  const rawImage = ogImage ?? jsonLd.image ?? null;
  const imageUrl = rawImage ? resolveUrl(rawImage, base) : null;
  const canonicalUrl = (ogUrl && resolveUrl(ogUrl, base)) || base.toString();

  const warnings: OpenGraphResult["warnings"] = [];
  if (!title) warnings.push("no_title");
  if (!description) warnings.push("no_description");
  if (!imageUrl) warnings.push("no_image");

  return { data: { title, description, imageUrl, canonicalUrl, warnings } };
}
