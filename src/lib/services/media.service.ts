import { unstable_cache } from "next/cache";
import { mediaProvider, youtubeSearchProvider } from "@/lib/providers/media";
import { findMatchMedia, type MatchedMedia } from "@/lib/providers/media/match-media-matcher";
import { COMPETITION_NAME_HINTS } from "@/lib/providers/media/competition-hints";
import { canonicalCompetitionId } from "@/lib/providers/football/ids";
import type { MediaItem, MediaCategory, Match } from "@/lib/types";
import type { Locale } from "@/lib/i18n/messages";

// كل القنوات المُهيَّأة تُجلَب دائماً بغضّ النظر عن الرقم المطلوب — راجع نفس
// التعليل في news.service.ts (POOL_SIZE هناك).
const POOL_SIZE = 150;

function sortMedia(items: MediaItem[], locale: Locale): MediaItem[] {
  return [...items].sort((a, b) => {
    const languageScore = (item: MediaItem) => (item.language === locale ? 0 : 1);
    const langDiff = languageScore(a) - languageScore(b);
    if (langDiff !== 0) return langDiff;
    return +new Date(b.publishedAt) - +new Date(a.publishedAt);
  });
}

// نفس منطق news.service.ts بالضبط (STOP_WORDS/titleWords/pickBetter) —
// مُكرَّر هنا عمداً بدل تعديل news.service.ts (يجب ألا يُمَس هذه الجولة).
const STOP_WORDS = new Set([
  "the", "a", "an", "to", "in", "on", "of", "for", "and", "with", "from", "by", "at", "as", "is", "are", "will", "after", "over",
  "في", "من", "إلى", "على", "مع", "عن", "أن", "إن", "هو", "هي", "بعد", "قبل", "هذا", "هذه",
]);

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function mediaQualityScore(item: MediaItem): number {
  let score = 0;
  if (item.thumbnailUrl) score += 2;
  if (item.description) score += 1;
  if (item.relatedName) score += 1;
  return score;
}

function pickBetterMedia(a: MediaItem, b: MediaItem): MediaItem {
  const scoreDiff = mediaQualityScore(b) - mediaQualityScore(a);
  if (scoreDiff !== 0) return scoreDiff > 0 ? b : a;
  return +new Date(b.publishedAt) > +new Date(a.publishedAt) ? b : a;
}

/**
 * دمج تكرار على مرحلتين — نفس فكرة الأخبار بالضبط:
 * 1) معرّف الفيديو نفسه (id يشمل videoId أصلاً — أدق من رابط مُطبَّع).
 * 2) بصمة كلمات العنوان شبه متطابقة (≥60% تداخل) ضمن 48 ساعة — نافذة أوسع
 *    من الأخبار (6 ساعات) لأن أكثر من قناة رسمية (نادٍ + بطولة) قد تنشر
 *    نفس ملخص المباراة بفارق يوم أو يومين، لا ساعات فقط.
 */
function dedupeMedia(items: MediaItem[]): MediaItem[] {
  const byId = new Map<string, MediaItem>();
  for (const item of items) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? pickBetterMedia(existing, item) : item);
  }

  const kept: MediaItem[] = [];
  const keptWords: Set<string>[] = [];

  for (const item of byId.values()) {
    const words = titleWords(item.title);
    let duplicateIndex = -1;

    for (let i = 0; i < kept.length; i++) {
      if (words.size === 0 || keptWords[i].size === 0) continue;
      const hoursApart = Math.abs(+new Date(kept[i].publishedAt) - +new Date(item.publishedAt)) / 3_600_000;
      if (hoursApart > 48) continue;
      let overlap = 0;
      for (const w of words) if (keptWords[i].has(w)) overlap++;
      if (overlap / Math.min(words.size, keptWords[i].size) >= 0.6) {
        duplicateIndex = i;
        break;
      }
    }

    if (duplicateIndex === -1) {
      kept.push(item);
      keptWords.push(words);
    } else {
      kept[duplicateIndex] = pickBetterMedia(kept[duplicateIndex], item);
    }
  }

  return kept;
}

/** [] بهدوء عند تعطيل المزوّد (VIDEO_PROVIDER_ENABLED=false) أو غياب أي
 * محتوى حقيقي — الواجهة تعرض حالة فارغة صريحة، لا Mock إطلاقاً. */
/** آخر مجمّع فيديو ناجح فعلياً (Next Data Cache، stale-while-revalidate): موجز
 * يوتيوب العام يتعطّل أحياناً كلياً (رُصد فعلياً: 404 لكل القنوات، حتى قنوات
 * Google نفسها) فتفشل كل الجولات وتصبح الصفحة فارغة رغم أن آخر فيديوهات حقيقية
 * جُلبت قبل دقائق. الكاش يُبقي آخر نتيجة حقيقية صالحة ويُجدّدها في الخلفية؛ فشل
 * التجديد لا يمحوها. لا يُخزَّن أي فشل (الخطأ يُرمى ولا يدخل الكاش)، ولا بيانات
 * مُختلَقة أبداً — فقط آخر ما جلبه المصدر الحقيقي. */
const getCachedProviderPool = unstable_cache(
  async () => (mediaProvider ? mediaProvider.getLatestMedia(POOL_SIZE) : []),
  ["media", "pool"],
  { revalidate: 900 }
);

export async function getMediaPool(locale: Locale = "ar"): Promise<MediaItem[]> {
  if (!mediaProvider) return [];
  const pool = await getCachedProviderPool();
  return dedupeMedia(sortMedia(pool, locale));
}

export async function getLatestMedia(limit = 12, locale: Locale = "ar"): Promise<MediaItem[]> {
  const pool = await getMediaPool(locale);
  return pool.slice(0, limit);
}

export async function getMediaByCategory(category: MediaCategory, locale: Locale = "ar", limit = 12): Promise<MediaItem[]> {
  const pool = await getMediaPool(locale);
  return pool.filter((m) => m.category === category).slice(0, limit);
}

export async function getMediaById(id: string, locale: Locale = "ar"): Promise<MediaItem | null> {
  const pool = await getMediaPool(locale);
  return pool.find((m) => m.id === id) ?? null;
}

/**
 * توسّع اختياري عبر YouTube Data API — يُفعَّل فقط عند توفّر
 * YOUTUBE_DATA_API_KEY فعلياً (youtubeSearchProvider غير null حينها). يُستَدعى
 * فقط كـfallback حين يفشل موجز Atom في إيجاد أي فيديو موثوق للمباراة — ليس
 * في كل زيارة، توفيراً لحصة البحث اليومية المحدودة (10,000 وحدة، search.list
 * = 100 وحدة). يجرّب صيغاً متعددة ويتوقف مبكراً بمجرد إيجاد مرشّح واثق واحد
 * على الأقل — لا حاجة لاستهلاك المزيد. نتائج البحث العام تُعلَّم
 * isOfficialSource:false دائماً (راجع youtube-search-provider.ts)، فتبقى
 * محكومة بنفس سقف MEDIUM في match-media-matcher — لا ترتفع لثقة HIGH إلا من
 * قنواتنا المعتمدة يدوياً.
 */
async function searchMatchVideosViaApi(match: Match): Promise<MediaItem[]> {
  if (!youtubeSearchProvider) return [];

  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const kickoffMs = +new Date(match.kickoff);
  const publishedAfter = new Date(kickoffMs - 2 * 3_600_000).toISOString();
  const publishedBefore = new Date(kickoffMs + 5 * 86_400_000).toISOString();

  const league = canonicalCompetitionId(match.competitionId);
  const competitionHint = league ? COMPETITION_NAME_HINTS[league]?.[0] : undefined;
  const matchDate = new Date(match.kickoff).toISOString().slice(0, 10);
  const hasScore = match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null;

  // مرتَّبة من الأكثر احتمالاً للنجاح (ملخص/أهداف مباشرة) إلى الأعم — يتوقف
  // البحث عند أول مرشّح واثق (HIGH/MEDIUM)، فترتيب الصيغ يقلّل الاستهلاك
  // الفعلي في الحالات الشائعة بدل تجربة كل الصيغ السبع دائماً.
  const queries = [
    `${home} vs ${away} highlights`,
    `${away} vs ${home} highlights`,
    `${home} vs ${away} goals`,
    `${home} vs ${away} extended highlights`,
    ...(competitionHint ? [`${home} ${away} ${competitionHint}`] : []),
    ...(hasScore ? [`${home} ${away} ${match.homeScore}-${match.awayScore}`] : []),
    `${home} ${away} ${matchDate}`,
  ];

  const collected: MediaItem[] = [];
  for (const query of queries) {
    try {
      const results = await youtubeSearchProvider.search(query, { publishedAfter, publishedBefore, isOfficialSource: false });
      collected.push(...results);
      if (findMatchMedia(match, collected, { limit: 1 }).length > 0) break;
    } catch (error) {
      console.error("[media] youtube search query failed:", error);
    }
  }

  return collected;
}

/**
 * فيديوهات موثوقة لمباراة بعينها فقط (HIGH/MEDIUM — راجع match-media-matcher)
 * — [] صريحة إن لم يوجد فيديو موثوق، لا فيديو عشوائي حتى لا يظهر القسم
 * فارغاً. لا طلب شبكة إضافي عادةً: getMediaPool تعتمد على تخزين يوتيوب
 * المؤقت نفسه (ساعة واحدة عبر Next fetch cache). فقط عند فشل موجز Atom
 * ووجود YOUTUBE_DATA_API_KEY فعلياً يُجرَّب بحث إضافي (راجع
 * searchMatchVideosViaApi) — مُخزَّن مؤقتاً بدوره لـ6 ساعات لكل استعلام.
 */
export async function getMatchMedia(match: Match, locale: Locale = "ar"): Promise<MatchedMedia[]> {
  const pool = await getMediaPool(locale);
  const matched = findMatchMedia(match, pool);
  if (matched.length > 0 || !youtubeSearchProvider) return matched;

  const searchCandidates = await searchMatchVideosViaApi(match);
  if (searchCandidates.length === 0) return matched;

  return findMatchMedia(match, dedupeMedia(searchCandidates));
}
