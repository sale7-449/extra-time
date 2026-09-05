import type { FootballProvider } from "./types";
import type { Competition, Match, MatchEvent, MatchStatLine, StandingsEntry, TeamLineup } from "@/lib/types";
import type { EspnScoreboardResponse, EspnSummaryResponse, EspnStandingEntry } from "./espn-types";
import {
  mapEspnBoxscoreToStats,
  mapEspnEventToMatch,
  mapEspnKeyEventsToEvents,
  mapEspnLeagueToCompetition,
  mapEspnRostersToLineups,
  mapEspnStandingsToStandings,
} from "./espn-mappers";
import { canonicalCompetitionId, espnSlugForCanonicalLeague } from "./ids";

const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/soccer";

export class EspnError extends Error {}

const FEATURED_SLUGS = ["ksa.1", "eng.1", "esp.1", "ger.1", "uefa.champions", "afc.champions"];

async function fetchJson<T>(url: string, revalidateSeconds: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, next: { revalidate: revalidateSeconds } });
    if (!response.ok) throw new EspnError(`ESPN request failed: ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * يربط مباراة معروفة (من API-Football أو TheSportsDB) بحدثها المقابل على
 * ESPN — لا اعتماد على تطابق ID (لا علاقة بين مخططات المعرّفات)، بل مطابقة
 * حقيقية عبر البطولة + تاريخ الالتقاء + اسما الفريقين. يُعيد null بصدق إن لم
 * يوجد تطابق واثق، بدل تخمين مباراة خاطئة.
 */
export async function findEspnEventId(params: {
  competitionId: string;
  kickoffIso: string;
  homeTeamName: string;
  awayTeamName: string;
}): Promise<{ eventId: string; leagueSlug: string } | null> {
  const canonicalLeague = canonicalCompetitionId(params.competitionId);
  const slug = canonicalLeague ? espnSlugForCanonicalLeague(canonicalLeague) : null;
  if (!slug) return null;

  // نبحث في تاريخ المباراة وحول يوم قبله/بعده (فروق التوقيت قد تحرّك
  // التاريخ يوماً عند ESPN) قبل الاستسلام.
  const base = new Date(params.kickoffIso);
  const candidateDates = [0, -1, 1].map((offset) => {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  });

  for (const date of candidateDates) {
    try {
      const data = await fetchJson<EspnScoreboardResponse>(`${BASE_URL}/${slug}/scoreboard?dates=${date}`, 300);
      for (const event of data.events ?? []) {
        const comp = event.competitions[0];
        if (!comp) continue;
        const home = comp.competitors.find((c) => c.homeAway === "home");
        const away = comp.competitors.find((c) => c.homeAway === "away");
        if (!home || !away) continue;
        if (teamsMatch(home.team.displayName, params.homeTeamName) && teamsMatch(away.team.displayName, params.awayTeamName)) {
          return { eventId: event.id, leagueSlug: slug };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** يجلب فقط الحقول الناقصة (أحداث/إحصائيات/تشكيلة) لمباراة مربوطة مسبقاً —
 * لا يُستبدَل أي حقل موجود بالفعل من المصدر الأصلي. فشل جزئي (مثلاً تشكيلة
 * غير منشورة) لا يمنع بقية الحقول من الظهور. */
export async function getEspnEnrichment(
  espnEventId: string,
  leagueSlug: string,
  targetTeamIds: { home: string; away: string }
): Promise<{ events: MatchEvent[]; stats: MatchStatLine[]; lineups: { home: TeamLineup; away: TeamLineup } | undefined }> {
  const data = await fetchJson<EspnSummaryResponse>(`${BASE_URL}/${leagueSlug}/summary?event=${espnEventId}`, 300);

  const homeCompetitor = data.header?.competitions?.[0]?.competitors.find((c) => c.homeAway === "home");
  const awayCompetitor = data.header?.competitions?.[0]?.competitors.find((c) => c.homeAway === "away");
  const events = data.keyEvents
    ? mapEspnKeyEventsToEvents(data.keyEvents, homeCompetitor?.team.id ?? "", awayCompetitor?.team.id ?? "", targetTeamIds)
    : [];
  const stats = data.boxscore?.teams ? mapEspnBoxscoreToStats(data.boxscore.teams) : [];
  const lineups = data.rosters ? mapEspnRostersToLineups(data.rosters) : undefined;

  return { events, stats, lineups };
}

export class EspnProvider implements FootballProvider {
  async getLiveMatches(): Promise<Match[]> {
    const results = await Promise.allSettled(
      FEATURED_SLUGS.map((slug) => fetchJson<EspnScoreboardResponse>(`${BASE_URL}/${slug}/scoreboard`, 60))
    );
    const matches: Match[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled") continue;
      for (const event of r.value.events ?? []) {
        if (event.status.type.state !== "in") continue;
        const m = mapEspnEventToMatch(event, FEATURED_SLUGS[i]);
        if (m) matches.push(m);
      }
    }
    if (matches.length === 0 && results.every((r) => r.status === "rejected")) {
      throw new EspnError("All ESPN live requests failed");
    }
    return matches;
  }

  async getMatchesByDateRange(range: "today" | "tomorrow" | "week"): Promise<Match[]> {
    const days = range === "today" ? [0] : range === "tomorrow" ? [1] : [0, 1, 2, 3, 4, 5, 6];
    const dates = days.map((offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10).replace(/-/g, "");
    });

    const tasks = FEATURED_SLUGS.flatMap((slug) =>
      dates.map((date) => () => fetchJson<EspnScoreboardResponse>(`${BASE_URL}/${slug}/scoreboard?dates=${date}`, 600))
    );
    const results = await Promise.allSettled(tasks.map((t) => t()));

    const matches: Match[] = [];
    let anySucceeded = false;
    let taskIndex = 0;
    for (const slug of FEATURED_SLUGS) {
      for (const _date of dates) {
        const r = results[taskIndex++];
        if (r.status === "fulfilled") {
          anySucceeded = true;
          for (const event of r.value.events ?? []) {
            const m = mapEspnEventToMatch(event, slug);
            if (m) matches.push(m);
          }
        }
      }
    }
    if (!anySucceeded) throw new EspnError("All ESPN date-range requests failed");
    return matches;
  }

  async getRecentResults(): Promise<Match[]> {
    // scoreboard الافتراضي (بلا date) يُعيد الجولة الحالية/الأخيرة لكل دوري.
    const results = await Promise.allSettled(
      FEATURED_SLUGS.map((slug) => fetchJson<EspnScoreboardResponse>(`${BASE_URL}/${slug}/scoreboard`, 1800))
    );
    const matches: Match[] = [];
    let anySucceeded = false;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled") continue;
      anySucceeded = true;
      for (const event of r.value.events ?? []) {
        if (event.status.type.state !== "post") continue;
        const m = mapEspnEventToMatch(event, FEATURED_SLUGS[i]);
        if (m) matches.push(m);
      }
    }
    if (!anySucceeded) throw new EspnError("All ESPN results requests failed");
    return matches
      .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
      .slice(0, 15);
  }

  async getMatchById(id: string): Promise<Match | null> {
    // id هنا هو معرّف الحدث الخام على ESPN (بعد فك بادئة المصدر في index.ts).
    // نحتاج البطولة لبناء الرابط، فنجرّب كل الدوريات المعروفة حتى ينجح أحدها
    // (ESPN لا يوفّر summary بلا تحديد دوري في المسار).
    for (const slug of FEATURED_SLUGS) {
      try {
        const data = await fetchJson<EspnSummaryResponse>(`${BASE_URL}/${slug}/summary?event=${id}`, 60);
        const competitors = data.header?.competitions?.[0]?.competitors;
        if (!competitors || competitors.length === 0) continue;

        const home = competitors.find((c) => c.homeAway === "home");
        const away = competitors.find((c) => c.homeAway === "away");
        if (!home || !away) continue;

        // كانت الحالة "FINISHED" ثابتة دوماً والموعد "الآن" بدل القراءة
        // الفعلية — يُظهر مباراة لم تُلعَب بعد وكأنها انتهت، ويعرض توقيتاً
        // مُختلَقاً بدل موعد الانطلاق الحقيقي.
        const comp = data.header?.competitions?.[0];
        const status: Match["status"] =
          comp?.status?.type.state === "post"
            ? "FINISHED"
            : comp?.status?.type.state === "in"
              ? "LIVE"
              : "SCHEDULED";

        const events = data.keyEvents
          ? mapEspnKeyEventsToEvents(data.keyEvents, home.team.id, away.team.id, {
              home: `espn-${home.team.id}`,
              away: `espn-${away.team.id}`,
            })
          : [];
        const stats = data.boxscore?.teams ? mapEspnBoxscoreToStats(data.boxscore.teams) : [];
        const lineups = data.rosters ? mapEspnRostersToLineups(data.rosters) : undefined;

        return {
          id: `espn-${id}`,
          competitionId: `espn-${slug}`,
          status,
          kickoff: comp?.date ?? new Date().toISOString(),
          homeTeam: { id: `espn-${home.team.id}`, name: home.team.displayName, shortName: home.team.displayName.slice(0, 3).toUpperCase(), logoUrl: home.team.logo ?? null, country: "" },
          awayTeam: { id: `espn-${away.team.id}`, name: away.team.displayName, shortName: away.team.displayName.slice(0, 3).toUpperCase(), logoUrl: away.team.logo ?? null, country: "" },
          homeScore: status !== "SCHEDULED" && home.score !== undefined ? Number(home.score) : null,
          awayScore: status !== "SCHEDULED" && away.score !== undefined ? Number(away.score) : null,
          events,
          stats,
          lineups,
        };
      } catch {
        continue;
      }
    }
    return null;
  }

  async getCompetitions(): Promise<Competition[]> {
    const results = await Promise.allSettled(
      FEATURED_SLUGS.map((slug) => fetchJson<EspnScoreboardResponse>(`${BASE_URL}/${slug}/scoreboard`, 3600))
    );
    const competitions: Competition[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled") continue;
      const league = r.value.leagues?.[0];
      competitions.push(mapEspnLeagueToCompetition(FEATURED_SLUGS[i], league?.name ?? FEATURED_SLUGS[i], league?.logos?.[0]?.href ?? null));
    }
    if (competitions.length === 0) throw new EspnError("All ESPN competitions requests failed");
    return competitions;
  }

  async getCompetitionById(id: string): Promise<Competition | null> {
    const slug = id;
    if (!FEATURED_SLUGS.includes(slug)) return null;
    const data = await fetchJson<EspnScoreboardResponse>(`${BASE_URL}/${slug}/scoreboard`, 3600);
    const league = data.leagues?.[0];
    return mapEspnLeagueToCompetition(slug, league?.name ?? slug, league?.logos?.[0]?.href ?? null);
  }

  async getStandings(competitionId: string): Promise<StandingsEntry[]> {
    const slug = competitionId;
    if (!FEATURED_SLUGS.includes(slug)) return [];
    const data = await fetchJson<{ children?: Array<{ standings?: { entries?: EspnStandingEntry[] } }> }>(
      `${STANDINGS_URL}/${slug}/standings`,
      3600
    );
    const entries = data.children?.[0]?.standings?.entries ?? [];
    return mapEspnStandingsToStandings(entries);
  }
}
