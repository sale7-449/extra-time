"use server";

import { getRecentResults, getUpcomingMatches } from "@/lib/services/matches.service";
import { getNewsPool } from "@/lib/services/news.service";
import { getMediaPool } from "@/lib/services/media.service";
import { safeResolve } from "@/lib/errors";
import { textMentionsTeam } from "@/lib/providers/media/team-aliases";
import { canonicalCompetitionId } from "@/lib/providers/football/ids";
import type { Locale } from "@/lib/i18n/messages";
import type { Match, MediaItem, NewsArticle } from "@/lib/types";

export interface FollowingFeed {
  matches: Match[];
  news: NewsArticle[];
  videos: MediaItem[];
}

const EMPTY_FEED: FollowingFeed = { matches: [], news: [], videos: [] };

/**
 * يجمع محتوى حقيقياً فقط للفرق/البطولات المُتابَعة (IDs من العميل عبر
 * localStorage — Phase 5 بلا حساب/backend) فوق الخدمات الحالية بالضبط — لا
 * provider جديد، لا منطق مطابقة جديد: نفس textMentionsTeam المُستخدَم أصلاً
 * في match-media-matcher.ts، ونفس canonicalCompetitionId المُستخدَم في صفحة
 * البطولة والبحث (Phase 4). مطابقة الفريق بالاسم لا بالمعرّف الخام تحديداً
 * لأن نفس الفريق الحقيقي قد يصل بمعرّفات مختلفة حسب المصدر الذي أنتج كل
 * مباراة/خبر (af-/tsdb-/espn- بلا مخطط معرّفات موحَّد للفرق في هذا المشروع)؛
 * المعرّف الحقيقي المخزَّن يبقى هو مرجع "هل يتابعه المستخدم فعلاً" الوحيد.
 */
export async function getFollowingFeed(
  teamNames: string[],
  competitionIds: string[],
  locale: Locale
): Promise<FollowingFeed> {
  if (teamNames.length === 0 && competitionIds.length === 0) return EMPTY_FEED;

  const [recentResult, upcomingResult, newsPool, mediaPool] = await Promise.all([
    safeResolve(getRecentResults(), { matches: [], unavailable: false }, "following-recent"),
    safeResolve(getUpcomingMatches("week"), { matches: [], unavailable: false }, "following-upcoming"),
    safeResolve(getNewsPool(locale), [], "following-news"),
    safeResolve(getMediaPool(locale), [], "following-media"),
  ]);

  const canonicalCompIds = new Set(
    competitionIds.map((id) => canonicalCompetitionId(id)).filter((x): x is string => x !== null)
  );

  const teamMentioned = (text: string) => teamNames.some((name) => textMentionsTeam(text, name));
  const competitionMatches = (competitionId: string | undefined) => {
    if (!competitionId) return false;
    const canon = canonicalCompetitionId(competitionId);
    return canon !== null && canonicalCompIds.has(canon);
  };

  const allMatches = new Map<string, Match>();
  for (const m of [...recentResult.matches, ...upcomingResult.matches]) allMatches.set(m.id, m);
  const matches = [...allMatches.values()]
    .filter((m) => teamMentioned(m.homeTeam.name) || teamMentioned(m.awayTeam.name) || competitionMatches(m.competitionId))
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
    .slice(0, 12);

  const news = newsPool
    .filter((n) => {
      const text = `${n.title} ${n.summary} ${n.relatedName ?? ""}`;
      return teamMentioned(text) || competitionMatches(n.competitionId);
    })
    .slice(0, 12);

  const videos = mediaPool
    .filter((v) => {
      const text = `${v.title} ${v.description ?? ""} ${v.relatedName ?? ""}`;
      return teamMentioned(text);
    })
    .slice(0, 12);

  return { matches, news, videos };
}
