"use server";

import { getNewsPool } from "@/lib/services/news.service";
import { getMediaPool } from "@/lib/services/media.service";
import { toNewsContentItem, toVideoContentItem } from "@/lib/providers/social/content-builders";
import { encodeNewsId } from "@/lib/news-id";
import { getServerLocale } from "@/lib/i18n/getServerLocale";
import type { ContentItem } from "@/lib/providers/social/types";
import { getAdminSession } from "@/lib/admin/session";
import {
  listContentDrafts,
  createContentDraft,
  updateContentDraft,
  publishContentDraft,
  archiveContentDraft,
  type ContentDraft,
  type ContentDestination,
} from "@/lib/admin/content-drafts";

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

/**
 * Content Studio — المرحلة الأولى (NEWS فقط). كل دالة هنا تتحقّق من جلسة
 * Admin بنفسها (لا تعتمد على حماية الصفحة وحدها) — Server Actions قابلة
 * للاستدعاء المباشر بمعزل عن الصفحة التي عرضت الزر.
 */

async function requireAdminUsername(): Promise<string> {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authorized");
  return session.username;
}

export type NewsDraftActionResult = { draft: ContentDraft } | { error: string };

export async function listNewsDraftsAction(): Promise<ContentDraft[]> {
  await requireAdminUsername();
  const drafts = await listContentDrafts();
  return drafts.filter((d) => d.kind === "NEWS");
}

/** استيراد خبر من رابط — بنفس آلية fetchAdminContent أعلاه بالضبط (مطابقة
 * ضمن مجمّع RSS الحقيقي المُهيَّأ أصلاً، لا جلب/scraping لرابط عام). */
export async function createNewsDraftFromUrlAction(input: {
  newsUrl: string;
  destinations: ContentDestination[];
}): Promise<NewsDraftActionResult> {
  const createdBy = await requireAdminUsername();
  const newsUrl = input.newsUrl.trim();
  if (!newsUrl) return { error: "empty" };
  if (input.destinations.length === 0) return { error: "no_destination" };

  const locale = await getServerLocale();
  const target = normalizeUrl(newsUrl);
  const pool = await getNewsPool(locale);
  const article = pool.find((a) => normalizeUrl(a.sourceUrl) === target);
  if (!article) return { error: "not_found" };

  const baseContent = toNewsContentItem(article);
  const draft = await createContentDraft({
    kind: "NEWS",
    sourceType: "URL",
    sourceRef: newsUrl,
    baseContent,
    destinations: input.destinations,
    createdBy,
  });
  if (!draft) return { error: "create_failed" };
  return { draft };
}

/** إنشاء خبر يدوياً — لا مصدر خارجي، المحرِّر هو المصدر (source: "Extra Time"). */
export async function createManualNewsDraftAction(input: {
  title: string;
  summary: string;
  imageUrl: string;
  destinations: ContentDestination[];
}): Promise<NewsDraftActionResult> {
  const createdBy = await requireAdminUsername();
  const title = input.title.trim();
  if (!title) return { error: "empty" };
  if (input.destinations.length === 0) return { error: "no_destination" };

  const locale = await getServerLocale();
  const baseContent: ContentItem = {
    id: "manual-pending",
    kind: "NEWS",
    title,
    summary: input.summary.trim() || undefined,
    imageUrl: input.imageUrl.trim() || null,
    publishedAt: new Date().toISOString(),
    language: locale,
    data: { source: "Extra Time", category: "FOOTBALL" },
  };

  const draft = await createContentDraft({
    kind: "NEWS",
    sourceType: "MANUAL",
    sourceRef: null,
    baseContent,
    destinations: input.destinations,
    createdBy,
  });
  if (!draft) return { error: "create_failed" };
  return { draft };
}

export async function updateNewsDraftAction(
  id: string,
  input: { title: string; summary: string; imageUrl: string; destinations: ContentDestination[] }
): Promise<NewsDraftActionResult> {
  await requireAdminUsername();
  const title = input.title.trim();
  if (!title) return { error: "empty" };
  if (input.destinations.length === 0) return { error: "no_destination" };

  const overrides: Partial<ContentItem> = {
    title,
    summary: input.summary.trim() || undefined,
    imageUrl: input.imageUrl.trim() || null,
  };
  const draft = await updateContentDraft(id, { overrides, destinations: input.destinations });
  if (!draft) return { error: "update_failed" };
  return { draft };
}

export async function publishNewsDraftAction(id: string): Promise<NewsDraftActionResult> {
  await requireAdminUsername();
  const draft = await publishContentDraft(id);
  if (!draft) return { error: "publish_failed" };
  return { draft };
}

export async function archiveNewsDraftAction(id: string): Promise<NewsDraftActionResult> {
  await requireAdminUsername();
  const draft = await archiveContentDraft(id);
  if (!draft) return { error: "archive_failed" };
  return { draft };
}
