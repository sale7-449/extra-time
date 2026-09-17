import type { Match, MatchEvent, NewsArticle, MediaItem } from "@/lib/types";
import type { ContentItem } from "./types";

/**
 * تحويل بيانات حقيقية موجودة أصلاً (Match/NewsArticle/MediaItem) إلى
 * ContentItem موحَّد — تحويل صرف بلا طلب شبكة إضافي وبلا أي حقل مُختلَق.
 * كل دالة تُعيد null صراحة إن كانت البيانات المطلوبة لهذا النوع تحديداً غير
 * مكتملة/غير موثوقة بدل بناء عنصر بحقل مفقود أو تخميني.
 */

/** فقط للمباريات المنتهية بنتيجة حقيقية معروفة — "نتيجة" لمباراة لم
 * تُلعَب بعد أو بلا نتيجة مؤكَّدة ليست نتيجة قابلة للمشاركة أصلاً. */
export function toMatchResultContentItem(match: Match): ContentItem | null {
  if (match.status !== "FINISHED" || match.homeScore === null || match.awayScore === null) return null;

  return {
    id: `match-result-${match.id}`,
    kind: "MATCH_RESULT",
    title: `${match.homeTeam.name} ${match.homeScore}-${match.awayScore} ${match.awayTeam.name}`,
    sourceUrl: `/matches/${match.id}`,
    publishedAt: match.kickoff,
    data: {
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      homeTeamLogo: match.homeTeam.logoUrl,
      awayTeamLogo: match.awayTeam.logoUrl,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      competitionId: match.competitionId,
    },
  };
}

/** فقط لهدف بلاعب مُعرَّف فعلياً من المصدر — "—" هو رمز "غير معروف" المُستخدَم
 * أصلاً في مطابقي ESPN/API-Football (راجع espn-mappers.ts)، فلا يُبنى منه
 * عنصر مشاركة باسم غير موثوق. */
export function toGoalContentItem(match: Match, event: MatchEvent): ContentItem | null {
  if (event.type !== "GOAL" || event.playerName === "—") return null;

  const scoringTeam = event.teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam;

  return {
    id: `goal-${event.id}`,
    kind: "GOAL",
    title: event.isOwnGoal ? `${event.playerName} (${event.minute}')` : `⚽ ${event.playerName} ${event.minute}'`,
    sourceUrl: `/matches/${match.id}`,
    publishedAt: match.kickoff,
    data: {
      player: event.playerName,
      assist: event.assistName,
      minute: event.minute,
      extraMinute: event.extraMinute,
      isOwnGoal: Boolean(event.isOwnGoal),
      team: scoringTeam.name,
      teamLogo: scoringTeam.logoUrl,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
    },
  };
}

/**
 * ملخص مباراة — بيانات الفرق/النتيجة/البطولة حصراً من المباراة الحقيقية
 * الحيّة (تُستدعى هذه الدالة من جديد في كل مرة يُعرَض/يُنشَر فيها المحتوى،
 * لا مرة واحدة فقط وقت الإنشاء) — بلا أي نص تحريري هنا إطلاقاً. النص
 * التحريري (العنوان/الملخص الفعليان) يصل حصراً عبر overrides في
 * resolveContentItem، فلا يُجمَّد أبداً كـ"حقيقة" داخل هذا الكائن. العنوان
 * هنا مجرّد تسمية محايدة (اسما الفريقين) تُستبدَل بالعنوان التحريري فوراً. */
export function toMatchSummaryBaseContent(match: Match): ContentItem {
  return {
    id: `match-summary-${match.id}`,
    kind: "MATCH_SUMMARY",
    title: `${match.homeTeam.name} × ${match.awayTeam.name}`,
    sourceUrl: `/matches/${match.id}`,
    publishedAt: match.kickoff,
    data: {
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      homeTeamLogo: match.homeTeam.logoUrl,
      awayTeamLogo: match.awayTeam.logoUrl,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      competitionId: match.competitionId,
      matchId: match.id,
      status: match.status,
    },
  };
}

/** صورة مستقلة — تحتاج رابط صورة حقيقياً دائماً، وإلا فلا معنى للعنصر أصلاً. */
export function toImageContentItem(input: { title: string; imageUrl: string; caption?: string }): ContentItem | null {
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) return null;

  return {
    id: `image-${Date.now()}`,
    kind: "IMAGE",
    title: input.title,
    summary: input.caption,
    imageUrl,
    publishedAt: new Date().toISOString(),
  };
}

export function toNewsContentItem(article: NewsArticle): ContentItem {
  return {
    id: `news-${article.id}`,
    kind: "NEWS",
    title: article.title,
    summary: article.summary,
    imageUrl: article.imageUrl,
    sourceUrl: article.sourceUrl,
    publishedAt: article.publishedAt,
    language: article.language,
    data: {
      source: article.source,
      category: article.category,
      relatedName: article.relatedName,
    },
  };
}

/** فيديو/Clip كرابط خارجي يدوي — لا يعتمد على مجمّع يوتيوب المُهيَّأ (خلافاً
 * لـtoVideoContentItem أدناه)، لكن يتطلّب رابطاً حقيقياً فعلياً دائماً. */
export function toManualVideoContentItem(input: {
  title: string;
  videoUrl: string;
  imageUrl?: string;
  caption?: string;
}): ContentItem | null {
  const videoUrl = input.videoUrl.trim();
  if (!videoUrl) return null;

  return {
    id: `video-manual-${Date.now()}`,
    kind: "VIDEO",
    title: input.title,
    summary: input.caption,
    imageUrl: input.imageUrl?.trim() || null,
    sourceUrl: videoUrl,
    publishedAt: new Date().toISOString(),
    data: { embedUrl: videoUrl },
  };
}

export function toVideoContentItem(item: MediaItem): ContentItem {
  return {
    id: `video-${item.id}`,
    kind: "VIDEO",
    title: item.title,
    summary: item.description,
    imageUrl: item.thumbnailUrl,
    sourceUrl: item.sourceUrl,
    publishedAt: item.publishedAt,
    language: item.language,
    data: {
      source: item.source,
      category: item.category,
      embedUrl: item.embedUrl,
    },
  };
}

/**
 * Content Studio (Draft) — مصدر الحقيقة الوحيد لكل من نسخة الموقع ونسخة
 * Snapchat: دمج صريح لـbase_content (لقطة مجمَّدة وقت الإنشاء/الاستيراد) مع
 * overrides (تعديلات المحرِّر) في ContentItem واحد. كلا الوجهتين يجب أن
 * تستهلكا ناتج هذه الدالة تحديداً، لا تُعيدا اشتقاق البيانات كل على حدة.
 */
export function resolveContentItem(baseContent: ContentItem, overrides: Partial<ContentItem>): ContentItem {
  return {
    ...baseContent,
    ...overrides,
    data: { ...baseContent.data, ...overrides.data },
  };
}
