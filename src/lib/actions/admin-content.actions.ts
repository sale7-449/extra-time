"use server";

import { getNewsPool } from "@/lib/services/news.service";
import { getMediaPool } from "@/lib/services/media.service";
import { toNewsContentItem, toVideoContentItem } from "@/lib/providers/social/content-builders";
import { encodeNewsId } from "@/lib/news-id";
import { getServerLocale } from "@/lib/i18n/getServerLocale";
import type { ContentItem } from "@/lib/providers/social/types";

/** رابط مطبَّع للمقارنة — نفس منطق news.service.ts (غير مُصدَّر هناك، فكُرِّر
 * هنا عمداً بدل تعديل ملف الخدمة لهذا الاستخدام الإداري المنفصل). */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "ref", "cmp", "CMP", "at_medium", "at_campaign", "ns_mchannel", "ns_source", "ns_campaign",
    ].forEach((p) => u.searchParams.delete(p));
    u.hash = "";
    return `${u.hostname}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** معرّف فيديو يوتيوب من أي صيغة رابط شائعة — لا تخمين، null صريح إن لم يكن
 * رابط يوتيوب صالحاً أصلاً. */
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/^\/(shorts|embed)\/([^/?]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

export interface AdminContentResult {
  news: { item: ContentItem; pagePath: string } | null;
  video: { item: ContentItem } | null;
  newsNotFound: boolean;
  videoNotFound: boolean;
}

const EMPTY_RESULT: AdminContentResult = { news: null, video: null, newsNotFound: false, videoNotFound: false };

/**
 * يبحث عن الرابط المُدخَل ضمن المجمّعات الحقيقية المُهيَّأة أصلاً (موجزات RSS
 * الإخبارية / موجزات يوتيوب الرسمية) — لا طلب شبكة جديد لرابط عشوائي، لا
 * scraping. رابط غير موجود ضمن هذه المصادر المسموح بها = "غير متاح" صريح،
 * لا اختلاق محتوى ولا جلب من مصدر غير مُعتمَد.
 */
export async function fetchAdminContent(input: {
  newsUrl?: string;
  videoUrl?: string;
  captionOverride?: string;
}): Promise<AdminContentResult> {
  const newsUrl = input.newsUrl?.trim();
  const videoUrl = input.videoUrl?.trim();
  if (!newsUrl && !videoUrl) return EMPTY_RESULT;

  const locale = await getServerLocale();
  const result: AdminContentResult = { news: null, video: null, newsNotFound: false, videoNotFound: false };
  const caption = input.captionOverride?.trim();

  if (newsUrl) {
    const target = normalizeUrl(newsUrl);
    const pool = await getNewsPool(locale);
    const article = pool.find((a) => normalizeUrl(a.sourceUrl) === target);
    if (article) {
      const item = toNewsContentItem(article);
      if (caption) item.title = caption;
      result.news = { item, pagePath: `/news/${encodeNewsId(article.id)}` };
    } else {
      result.newsNotFound = true;
    }
  }

  if (videoUrl) {
    const videoId = extractYouTubeId(videoUrl);
    const pool = await getMediaPool(locale);
    const media = videoId ? pool.find((m) => m.id === `yt-${videoId}`) : undefined;
    if (media) {
      const item = toVideoContentItem(media);
      if (caption) item.title = caption;
      result.video = { item };
    } else {
      result.videoNotFound = true;
    }
  }

  return result;
}
