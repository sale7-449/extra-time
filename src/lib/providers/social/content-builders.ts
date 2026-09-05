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
