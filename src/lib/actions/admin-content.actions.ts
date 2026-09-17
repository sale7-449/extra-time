"use server";

import { getNewsPool } from "@/lib/services/news.service";
import { getMediaPool } from "@/lib/services/media.service";
import { getMatch, getUpcomingMatches, getRecentResults } from "@/lib/services/matches.service";
import {
  toNewsContentItem,
  toVideoContentItem,
  toManualVideoContentItem,
  toMatchResultContentItem,
  toGoalContentItem,
  toMatchSummaryBaseContent,
  toImageContentItem,
} from "@/lib/providers/social/content-builders";
import { encodeNewsId } from "@/lib/news-id";
import { getServerLocale } from "@/lib/i18n/getServerLocale";
import { COMPETITION_CATALOG } from "@/lib/providers/football/competition-catalog";
import { canonicalCompetitionId, tagId } from "@/lib/providers/football/ids";
import { getTeamsByCompetition } from "@/lib/providers/football";
import { uploadContentMedia } from "@/lib/admin/content-media-storage";
import type { ContentItem, Attachment } from "@/lib/providers/social/types";
import type { Match, Team } from "@/lib/types";
import { getAdminSession } from "@/lib/admin/session";
import {
  listContentDrafts,
  getContentDraft,
  createContentDraft,
  updateContentDraft,
  publishContentDraft,
  archiveContentDraft,
  type ContentDraft,
  type ContentDraftKind,
  type ContentDestination,
  type SubjectType,
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
 * Content Studio — تصميم Subject/Entity الرسمي: كل محتوى مرتبط بموضوع
 * (مباراة/نادٍ/بطولة/خبر عام/عام) عبر subjectType+subjectId، لا عبر
 * sourceType (الذي يبقى لتوثيق منشأ النص التحريري فقط). كل دالة هنا تتحقّق
 * من جلسة Admin بنفسها (لا تعتمد على حماية الصفحة وحدها) — Server Actions
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
 * NEWS فقط، subjectType=NEWS دائماً — استيراد الرابط العام خارج النطاق حالياً. */
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
    subjectType: "NEWS",
    baseContent,
    destinations: input.destinations,
    createdBy,
  });
  if (!draft) return { error: "create_failed" };
  return { draft };
}

/**
 * إنشاء يدوي عام — NEWS/IMAGE/VIDEO، مرتبط اختيارياً بموضوع حقيقي (نادٍ/
 * بطولة/مباراة) عبر subjectType+subjectId، أو غير مرتبط (NEWS/GENERAL).
 * المحتوى التحريري بالكامل (عنوان/ملخص/صورة/فيديو) يُخزَّن كما هو — لا بيانات
 * رياضية تُنسَخ هنا؛ subjectId مجرّد مرجع، لا مصدر بيانات.
 */
export async function createManualDraftAction(input: {
  kind: "NEWS" | "IMAGE" | "VIDEO";
  subjectType: SubjectType;
  subjectId?: string | null;
  title: string;
  summary: string;
  imageUrl: string;
  videoUrl?: string;
  destinations: ContentDestination[];
}): Promise<DraftActionResult> {
  const createdBy = await requireAdminUsername();
  const title = input.title.trim();
  if (!title) return { error: "empty" };
  if (input.destinations.length === 0) return { error: "no_destination" };
  if ((input.subjectType === "TEAM" || input.subjectType === "COMPETITION" || input.subjectType === "MATCH") && !input.subjectId) {
    return { error: "subject_required" };
  }

  const locale = await getServerLocale();
  let baseContent: ContentItem | null;

  if (input.kind === "IMAGE") {
    baseContent = toImageContentItem({ title, imageUrl: input.imageUrl, caption: input.summary.trim() || undefined });
    if (!baseContent) return { error: "image_required" };
  } else if (input.kind === "VIDEO") {
    baseContent = toManualVideoContentItem({
      title,
      videoUrl: input.videoUrl ?? "",
      imageUrl: input.imageUrl,
      caption: input.summary.trim() || undefined,
    });
    if (!baseContent) return { error: "video_required" };
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
    subjectType: input.subjectType,
    subjectId: input.subjectId ?? null,
    baseContent,
    destinations: input.destinations,
    createdBy,
  });
  if (!draft) return { error: "create_failed" };
  return { draft };
}

/** مجموعات المباريات الحقيقية الثلاث لواجهة "مباريات" — نفس الخدمات
 * المستخدَمة أصلاً في /matches، بلا provider جديد. */
export interface MatchGroups {
  today: Match[];
  upcoming: Match[];
  recent: Match[];
}

export async function listMatchGroupsAction(): Promise<MatchGroups> {
  await requireAdminUsername();
  const [todayResult, weekResult, recentResult] = await Promise.all([
    getUpcomingMatches("today"),
    getUpcomingMatches("week"),
    getRecentResults(),
  ]);
  const todayIds = new Set(todayResult.matches.map((m) => m.id));
  return {
    today: todayResult.matches,
    upcoming: weekResult.matches.filter((m) => !todayIds.has(m.id)),
    recent: recentResult.matches,
  };
}

/** بحث مباريات حقيقية (نتائج أخيرة + مباريات الأسبوع) — نفس آلية substring
 * المستخدَمة في /search، بلا provider جديد. */
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

export interface TeamsByCompetitionGroup {
  /** معرّف بطولة موسوم (af-140...) — لعرض اسمها عبر localizeCompetitionShortName. */
  competitionId: string;
  teams: Team[];
  /** true = تعذّر جلب التشكيلة الكاملة الحقيقية للبطولة (كلا المصدرين)،
   * فهذه قائمة جزئية مُستخلَصة من مباريات النافذة الحالية فقط — لا تُعامَل
   * كقائمة كاملة. */
  isPartial: boolean;
}

/** بديل جزئي صادق (لا اختلاق) عند تعذّر قائمة الأندية الكاملة الحقيقية لكل
 * بطولات الكتالوج معاً — استخلاص من مباريات النافذة الحالية (نتائج أخيرة +
 * أسبوع قادم)، مُجمَّع عبر canonicalCompetitionId. */
async function derivePartialTeamsFromMatchPool(): Promise<{ byCanonical: Map<string, Map<string, Team>>; other: Map<string, Team> }> {
  const [recent, week] = await Promise.all([getRecentResults(), getUpcomingMatches("week")]);
  const byCanonical = new Map<string, Map<string, Team>>();
  const other = new Map<string, Team>();
  const catalogCanonicalIds = new Set(COMPETITION_CATALOG.filter((e) => e.afId !== undefined).map((e) => String(e.afId)));

  for (const m of [...recent.matches, ...week.matches]) {
    const canonical = canonicalCompetitionId(m.competitionId);
    const bucket = canonical && catalogCanonicalIds.has(canonical) ? byCanonical.get(canonical) ?? new Map<string, Team>() : null;
    for (const team of [m.homeTeam, m.awayTeam]) {
      if (bucket) bucket.set(team.id, team);
      else other.set(team.id, team);
    }
    if (canonical && bucket) byCanonical.set(canonical, bucket);
  }
  return { byCanonical, other };
}

/**
 * أندية حقيقية مُصنَّفة حسب الدوري/المسابقة أولاً. لكل بطولة في الكتالوج
 * تُجرَّب أولاً تشكيلتها الكاملة الحقيقية للموسم الحالي (getTeamsByCompetition
 * — API-Football ثم TheSportsDB) بدل الاكتفاء بمن لعب ضمن نافذة مباريات
 * محدودة؛ فقط إن تعذّر كلا المصدرين (تعطّل مؤقت/حساب) تُستخدَم القائمة
 * الجزئية المُستخلَصة من تجمّع المباريات كحل احتياطي صريح (isPartial=true)،
 * لا كإسقاط صامت لأندية حقيقية. نادٍ لا تُحَل بطولته لأي عنصر في الكتالوج
 * يظهر صراحة ضمن "other". نادٍ يلعب في أكثر من مسابقة يظهر بمعرّفه الحقيقي
 * نفسه تحت كل مسابقة لعب فيها فعلاً — لا نسخ مُصطنَعة.
 */
export async function listTeamsByCompetitionAction(): Promise<{ groups: TeamsByCompetitionGroup[]; other: Team[] }> {
  await requireAdminUsername();

  let fallback: { byCanonical: Map<string, Map<string, Team>>; other: Map<string, Team> } | null = null;

  const groups: TeamsByCompetitionGroup[] = [];
  for (const entry of COMPETITION_CATALOG) {
    if (entry.afId === undefined) continue;

    const fullList = await getTeamsByCompetition({ afId: entry.afId });
    if (fullList && fullList.length > 0) {
      groups.push({
        competitionId: tagId("af", entry.afId),
        teams: [...fullList].sort((a, b) => a.name.localeCompare(b.name)),
        isPartial: false,
      });
      continue;
    }

    // تعذّر المصدران الحقيقيان الكاملان لهذه البطولة تحديداً — احتياط جزئي.
    fallback ??= await derivePartialTeamsFromMatchPool();
    const partial = fallback.byCanonical.get(String(entry.afId));
    if (partial && partial.size > 0) {
      groups.push({
        competitionId: tagId("af", entry.afId),
        teams: [...partial.values()].sort((a, b) => a.name.localeCompare(b.name)),
        isPartial: true,
      });
    }
  }

  const other = fallback ? [...fallback.other.values()].sort((a, b) => a.name.localeCompare(b.name)) : [];
  return { groups, other };
}

/** تفاصيل مباراة كاملة (بأحداثها) بعد اختيارها — getMatch (خلافاً لقوائم
 * البحث/المجموعات) يجلب الأحداث الحقيقية أيضاً. للعرض فقط — لا تعديل على
 * المباراة نفسها هنا إطلاقاً. */
export async function getMatchDetailAction(matchId: string): Promise<Match | null> {
  await requireAdminUsername();
  const { match } = await getMatch(matchId);
  return match;
}

/**
 * إنشاء Draft مرتبط بمباراة حقيقية بأحد الأنواع الرياضية الثلاثة —
 * MATCH_RESULT (نتيجة نهائية فقط)، GOAL (حدث هدف حقيقي موثَّق)، أو
 * MATCH_SUMMARY (نص تحريري + بيانات المباراة). لا تُنسَخ بيانات المباراة هنا
 * كحقيقة دائمة — baseContent المُخزَّن أدنى (placeholder)، والبيانات
 * الرياضية الفعلية تُحَل حيّة عند كل معاينة/نشر عبر getResolvedSubjectBaseAction
 * أدناه. النص التحريري لملخص المباراة يُخزَّن في overrides مباشرة، لا في
 * baseContent. لا تعديل على بيانات المباراة الأصلية بأي شكل.
 */
export async function createMatchSportDraftAction(input: {
  kind: "MATCH_RESULT" | "GOAL" | "MATCH_SUMMARY";
  matchId: string;
  eventId?: string;
  title?: string;
  summary?: string;
  imageUrl?: string;
  destinations: ContentDestination[];
}): Promise<DraftActionResult> {
  const createdBy = await requireAdminUsername();
  if (input.destinations.length === 0) return { error: "no_destination" };

  const { match } = await getMatch(input.matchId);
  if (!match) return { error: "match_not_found" };

  let subjectEventId: string | null = null;
  let overrides: Partial<ContentItem> | undefined;
  let placeholderTitle: string;

  if (input.kind === "MATCH_RESULT") {
    if (!toMatchResultContentItem(match)) return { error: "match_not_finished" };
    placeholderTitle = `${match.homeTeam.name} × ${match.awayTeam.name}`;
  } else if (input.kind === "GOAL") {
    const event = match.events.find((e) => e.id === input.eventId);
    if (!event) return { error: "event_not_found" };
    if (!toGoalContentItem(match, event)) return { error: "goal_data_incomplete" };
    subjectEventId = event.id;
    placeholderTitle = `${match.homeTeam.name} × ${match.awayTeam.name}`;
  } else {
    const title = input.title?.trim();
    if (!title) return { error: "empty" };
    overrides = { title, summary: input.summary?.trim() || undefined, imageUrl: input.imageUrl?.trim() || undefined };
    placeholderTitle = title;
  }

  const baseContent: ContentItem = {
    id: `${input.kind.toLowerCase()}-${match.id}`,
    kind: input.kind,
    title: placeholderTitle,
    publishedAt: match.kickoff,
  };

  const draft = await createContentDraft({
    kind: input.kind as ContentDraftKind,
    sourceType: "MANUAL",
    sourceRef: null,
    subjectType: "MATCH",
    subjectId: input.matchId,
    subjectEventId,
    baseContent,
    overrides,
    destinations: input.destinations,
    createdBy,
  });
  if (!draft) return { error: "create_failed" };
  return { draft };
}

/**
 * البيانات الرياضية الحيّة الحالية لمسودة مرتبطة بمباراة (MATCH_RESULT/GOAL/
 * MATCH_SUMMARY) — تُجلَب من جديد من مزوّد المباريات في كل استدعاء، لا من
 * baseContent المخزَّن. هذا هو "base" الفعلي الذي يُمرَّر لـresolveContentItem
 * وقت المعاينة/النشر؛ null إن لم تعد المباراة متاحة أو المحتوى غير مرتبط
 * بمباراة أصلاً (عندها base_content المخزَّن يبقى المرجع الوحيد المتاح).
 */
export async function getResolvedSubjectBaseAction(draftId: string): Promise<ContentItem | null> {
  await requireAdminUsername();
  const draft = await getContentDraft(draftId);
  if (!draft || draft.subjectType !== "MATCH" || !draft.subjectId) return null;

  const { match } = await getMatch(draft.subjectId);
  if (!match) return null;

  if (draft.kind === "MATCH_RESULT") return toMatchResultContentItem(match);
  if (draft.kind === "GOAL") {
    const event = match.events.find((e) => e.id === draft.subjectEventId);
    return event ? toGoalContentItem(match, event) : null;
  }
  if (draft.kind === "MATCH_SUMMARY") return toMatchSummaryBaseContent(match);
  return null;
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

/**
 * رفع صورة/فيديو من جهاز المسؤول إلى Supabase Storage (bucket content-media)
 * — بديل اختياري للرابط الخارجي، لا يُلغيه. نفس حماية Admin المطبَّقة على
 * كل Server Action هنا (requireAdminUsername). `folder` هو id المسودة
 * الحقيقي عند التعديل، أو مفتاح مؤقت آمن يُنشئه العميل قبل إنشاء المسودة.
 */
export async function uploadContentMediaAction(input: {
  folder: string;
  kind: "IMAGE" | "VIDEO";
  file: File;
}): Promise<{ url: string } | { error: string }> {
  await requireAdminUsername();
  return uploadContentMedia(input);
}
