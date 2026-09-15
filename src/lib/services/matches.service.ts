import { footballProvider, RealDataUnavailableError } from "@/lib/providers/football";
import type { LineupPlayer, Match, MatchEvent, Team, TeamLineup } from "@/lib/types";
import { getServerLocale } from "@/lib/i18n/getServerLocale";
import { localizeMockText } from "@/lib/i18n/localized-names";
import { getDisplayTeamName, getLocalizedPlayerName } from "@/lib/i18n/sports-names";

/**
 * طبقة الخدمة — الواجهة (Components/Pages) تستدعي هذه الدوال فقط، ولا تعرف
 * مصدر البيانات (Mock أو API-Football). كل التبديل يحدث خلف footballProvider.
 *
 * كل دالة تُعيد `unavailable: true` عندما يكون API-Football مُهيَّأً لكن فشل
 * فعلياً (Rate Limit، شبكة...) — الواجهة حينها تعرض حالة "تعذر التحديث"
 * صريحة بدل الصمت أو عرض بيانات Mock قديمة على أنها حالية. `unavailable`
 * تبقى false في بيئة بلا مفتاح API (Mock مقصود ومُعلَن، لا خطأ هناك).
 */

export interface MatchesResult {
  matches: Match[];
  unavailable: boolean;
}

export interface MatchResult {
  match: Match | null;
  unavailable: boolean;
}

async function localizeMatches(matches: Match[]): Promise<Match[]> {
  const locale = await getServerLocale();
  const localizeTeam = (team: Team): Team => ({ ...team, name: getDisplayTeamName(team.id, team.name, locale) });
  const localizePlayer = (player: LineupPlayer): LineupPlayer => ({
    ...player,
    name: getLocalizedPlayerName(player.playerId, player.name, locale),
  });
  const localizeLineup = (lineup: TeamLineup): TeamLineup => ({
    ...lineup,
    coach: lineup.coach ? localizeMockText(lineup.coach, locale) : lineup.coach,
    startXI: lineup.startXI.map(localizePlayer),
    substitutes: lineup.substitutes.map(localizePlayer),
  });
  // يغطي مسجّلي الأهداف وصانعيها وأسماء اللاعبين في التبديلات/البطاقات
  // معاً — نفس حقل playerName/assistName لكل أنواع الأحداث.
  const localizeEvent = (event: MatchEvent): MatchEvent => ({
    ...event,
    playerName: getLocalizedPlayerName(event.playerId, event.playerName, locale),
    assistName: event.assistName ? getLocalizedPlayerName(event.assistId, event.assistName, locale) : event.assistName,
  });

  return matches.map((m) => ({
    ...m,
    homeTeam: localizeTeam(m.homeTeam),
    awayTeam: localizeTeam(m.awayTeam),
    round: m.round ? localizeMockText(m.round, locale) : m.round,
    venue: m.venue ? localizeMockText(m.venue, locale) : m.venue,
    city: m.city ? localizeMockText(m.city, locale) : m.city,
    referee: m.referee ? localizeMockText(m.referee, locale) : m.referee,
    events: m.events.map(localizeEvent),
    lineups: m.lineups
      ? { home: localizeLineup(m.lineups.home), away: localizeLineup(m.lineups.away) }
      : m.lineups,
  }));
}

async function resolveMatches(fetcher: () => Promise<Match[]>): Promise<MatchesResult> {
  try {
    return { matches: await localizeMatches(await fetcher()), unavailable: false };
  } catch (error) {
    if (error instanceof RealDataUnavailableError) return { matches: [], unavailable: true };
    throw error;
  }
}

export async function getLiveMatches(): Promise<MatchesResult> {
  return resolveMatches(() => footballProvider.getLiveMatches());
}

export async function getUpcomingMatches(range: "today" | "tomorrow" | "week"): Promise<MatchesResult> {
  return resolveMatches(() => footballProvider.getMatchesByDateRange(range));
}

export async function getRecentResults(): Promise<MatchesResult> {
  return resolveMatches(() => footballProvider.getRecentResults());
}

export async function getMatch(id: string): Promise<MatchResult> {
  try {
    const match = await footballProvider.getMatchById(id);
    if (!match) return { match: null, unavailable: false };
    const [localized] = await localizeMatches([match]);
    return { match: localized, unavailable: false };
  } catch (error) {
    if (error instanceof RealDataUnavailableError) return { match: null, unavailable: true };
    throw error;
  }
}
