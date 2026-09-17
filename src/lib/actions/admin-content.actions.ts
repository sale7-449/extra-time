"use server";

import { getNewsPool } from "@/lib/services/news.service";
import { getMediaPool } from "@/lib/services/media.service";
import { getMatch, getUpcomingMatches, getRecentResults } from "@/lib/services/matches.service";
import {
  toNewsContentItem,
  toVideoContentItem,
  toMatchResultContentItem,
  toGoalContentItem,
  toMatchSummaryContentItem,
  toImageContentItem,
} from "@/lib/providers/social/content-builders";
import { encodeNewsId } from "@/lib/news-id";
import { getServerLocale } from "@/lib/i18n/getServerLocale";
import type { ContentItem, Attachment } from "@/lib/providers/social/types";
import type { Match } from "@/lib/types";
import { getAdminSession } from "@/lib/admin/session";
import {
  listContentDrafts,
  createContentDraft,
  updateContentDraft,
  publishContentDraft,
  archiveContentDraft,
  type ContentDraft,
  type ContentDraftKind,
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
 * Content Studio — الموجة الأولى من المصادر الحرة: NEWS/IMAGE (يدوي أو رابط)
 * وMATCH_RESULT/GOAL/MATCH_SUMMARY (من مباراة حقيقية). كل دالة هنا تتحقّق من
 * جلسة Admin بنفسها (لا تعتمد على حماية الصفحة وحدها) — Server Actions
 * قابلة للاستدعاء المباشر بمعزل عن الصفحة التي عرضت الزر.
 */

async function requireAdminUsername(): Promise<string> {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authorized");
  return session.username;
}

export type DraftActionResult = { draft: ContentDraft } | { error: string };

export async function listContentDraftsAction(): Promise<ContentDraft[]> {
  await requireAdminUsername();
  return listContentDrafts();
}

/** استيراد خبر من رابط — بنفس آلية fetchAdminContent أعلاه بالضبط (مطابقة
 * ضمن مجمّع RSS الحقيقي المُهيَّأ أصلاً، لا جلب/scraping لرابط عام). يبقى
 * NEWS فقط — استيراد الرابط العام خارج نطاق هذه الموجة. */
export async function createNewsDraftFromUrlAction(input: {
  newsUrl: string;
  destinations: ContentDestination[];
}): Promise<DraftActionResult> {
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

/** إنشاء خبر أو صورة يدوياً — لا مصدر خارجي. صورة تتطلّب رابط صورة حقيقياً
 * (لا معنى لعنصر IMAGE بلا صورة). */
export async function createManualDraftAction(input: {
  kind: "NEWS" | "IMAGE";
  title: string;
  summary: string;
  imageUrl: string;
  destinations: ContentDestination[];
}): Promise<DraftActionResult> {
  const createdBy = await requireAdminUsername();
  const title = input.title.trim();
  if (!title) return { error: "empty" };
  if (input.destinations.length === 0) return { error: "no_destination" };

  const locale = await getServerLocale();
  let baseContent: ContentItem | null;

  if (input.kind === "IMAGE") {
    baseContent = toImageContentItem({ title, imageUrl: input.imageUrl, caption: input.summary.trim() || undefined });
    if (!baseContent) return { error: "image_required" };
  } else {
    baseContent = {
      id: "manual-pending",
      kind: "NEWS",
      title,
      summary: input.summary.trim() || undefined,
      imageUrl: input.imageUrl.trim() || null,
      publishedAt: new Date().toISOString(),
      language: locale,
      data: { source: "Extra Time", category: "FOOTBALL" },
    };
  }

  const draft = await createContentDraft({
    kind: input.kind,
    sourceType: "MANUAL",
    sourceRef: null,
    baseContent,
    destinations: input.destinations,
    createdBy,
  });
  if (!draft) return { error: "create_failed" };
  return { draft };
}

/** بحث مباريات حقيقية (نتائج أخيرة + مباريات الأسبوع) لمحرّر المباراة — نفس
 * آلية substring المستخدَمة في /search، بلا provider جديد. */
export async function searchMatchesAction(query: string): Promise<Match[]> {
  await requireAdminUsername();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const [recent, week] = await Promise.all([getRecentResults(), getUpcomingMatches("week")]);
  const seen = new Set<string>();
  const matches: Match[] = [];
  for (const m of [...recent.matches, ...week.matches]) {
    if (seen.has(m.id)) continue;
    const haystack = `${m.homeTeam.name} ${m.awayTeam.name}`.toLowerCase();
    if (!haystack.includes(q)) continue;
    seen.add(m.id);
    matches.push(m);
  }
  return matches.slice(0, 20);
}

/** تفاصيل مباراة كاملة (بأحداثها) بعد اختيارها من نتائج البحث — getMatch
 * (خلافاً لقوائم البحث) يجلب الأحداث الحقيقية أيضاً. لا تعديل على المباراة
 * نفسها هنا إطلاقاً — للعرض فقط. */
export async function getMatchDetailAction(matchId: string): Promise<Match | null> {
  await requireAdminUsername();
  const { match } = await getMatch(matchId);
  return match;
}

/** إنشاء Draft من مباراة حقيقية — MATCH_RESULT (نتيجة نهائية فقط)، GOAL
 * (حدث هدف حقيقي من أحداث المباراة)، أو MATCH_SUMMARY (نص تحريري من
 * المحرِّر مربوط ببيانات المباراة الحقيقية). لا تعديل على بيانات المباراة
 * الأصلية بأي شكل — أي نص تحريري لاحق يذهب إلى overrides عبر updateDraftAction. */
export async function createMatchDraftAction(input: {
  kind: "MATCH_RESULT" | "GOAL" | "MATCH_SUMMARY";
  matchId: string;
  eventId?: string;
  title?: string;
  summary?: string;
  destinations: ContentDestination[];
}): Promise<DraftActionResult> {
  const createdBy = await requireAdminUsername();
  if (input.destinations.length === 0) return { error: "no_destination" };

  const { match } = await getMatch(input.matchId);
  if (!match) return { error: "match_not_found" };

  let baseContent: ContentItem | null;
  if (input.kind === "MATCH_RESULT") {
    baseContent = toMatchResultContentItem(match);
    if (!baseContent) return { error: "match_not_finished" };
  } else if (input.kind === "GOAL") {
    const event = match.events.find((e) => e.id === input.eventId);
    if (!event) return { error: "event_not_found" };
    baseContent = toGoalContentItem(match, event);
    if (!baseContent) return { error: "goal_data_incomplete" };
  } else {
    const title = input.title?.trim();
    if (!title) return { error: "empty" };
    baseContent = toMatchSummaryContentItem(match, { title, summary: input.summary?.trim() });
  }

  const draft = await createContentDraft({
    kind: input.kind as ContentDraftKind,
    sourceType: "MATCH",
    sourceRef: input.matchId,
    baseContent,
    destinations: input.destinations,
    createdBy,
  });
  if (!draft) return { error: "create_failed" };
  return { draft };
}

/** تحديث عام يعمل لأي نوع Draft — الحقول (عنوان/ملخص/صورة/مرفقات/وجهة) نفسها
 * بغضّ النظر عن kind، فالفرع الوحيد الخاص بالنوع هو baseContent المُجمَّد
 * عند الإنشاء (لا يتغيّر)، لا overrides. */
export async function updateDraftAction(
  id: string,
  input: {
    title: string;
    summary: string;
    imageUrl: string;
    destinations: ContentDestination[];
    attachments?: Attachment[];
  }
): Promise<DraftActionResult> {
  await requireAdminUsername();
  const title = input.title.trim();
  if (!title) return { error: "empty" };
  if (input.destinations.length === 0) return { error: "no_destination" };

  const overrides: Partial<ContentItem> = {
    title,
    summary: input.summary.trim() || undefined,
    imageUrl: input.imageUrl.trim() || null,
  };
  const draft = await updateContentDraft(id, { overrides, destinations: input.destinations, attachments: input.attachments });
  if (!draft) return { error: "update_failed" };
  return { draft };
}

export async function publishDraftAction(id: string): Promise<DraftActionResult> {
  await requireAdminUsername();
  const draft = await publishContentDraft(id);
  if (!draft) return { error: "publish_failed" };
  return { draft };
}

export async function archiveDraftAction(id: string): Promise<DraftActionResult> {
  await requireAdminUsername();
  const draft = await archiveContentDraft(id);
  if (!draft) return { error: "archive_failed" };
  return { draft };
}
