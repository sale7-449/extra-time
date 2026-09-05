import type { FootballProvider } from "./types";
import type { Competition, Match, StandingsEntry } from "@/lib/types";
import type { TsdbEvent, TsdbLeague, TsdbLineupRow, TsdbStandingRow } from "./thesportsdb-types";
import {
  mapTsdbEventToMatch,
  mapTsdbLeagueToCompetition,
  mapTsdbLineupToLineups,
  mapTsdbStandingsToStandings,
} from "./thesportsdb-mappers";

const BASE_URL = "https://www.thesportsdb.com/api/v1/json";

/** مفتاح TheSportsDB العام للاختبار — مجاني وموثَّق رسمياً من الخدمة نفسها
 * لهذا الاستخدام بالضبط (لا تسجيل، لا اشتراك)، بحدود معدّل متواضعة. للإنتاج
 * الفعلي لاحقاً يُفضَّل تسجيل مفتاح شخصي مجاني من thesportsdb.com. */
const PUBLIC_TEST_KEY = "3";

export class TheSportsDbError extends Error {}

/** معرّفات البطولات الخمس المؤكَّدة على TheSportsDB (لا يوجد معرّف موثوق لدوري
 * أبطال آسيا هناك حتى الآن — تُترك خارج هذا المزوّد بدل تخمينه). */
const FEATURED_LEAGUE_IDS: Record<string, number> = {
  roshn: 4668,
  "premier-league": 4328,
  "la-liga": 4335,
  ucl: 4480,
  bundesliga: 4331,
};

const FEATURED_LEAGUE_ID_LIST = Object.values(FEATURED_LEAGUE_IDS);
const FEATURED_LEAGUE_ID_SET = new Set(FEATURED_LEAGUE_ID_LIST);

function currentSeason(): string {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

export class TheSportsDbProvider implements FootballProvider {
  private async request<T>(path: string, params: Record<string, string | number> = {}, revalidateSeconds = 300): Promise<T[]> {
    const url = new URL(`${BASE_URL}/${PUBLIC_TEST_KEY}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, { signal: controller.signal, next: { revalidate: revalidateSeconds } });
      if (!response.ok) throw new TheSportsDbError(`TheSportsDB request failed: ${response.status}`);

      const json = await response.json();
      // كل استجابات v1 تُغلَّف بمفتاح واحد (events/leagues/table/lineup)، وقد
      // يكون null صراحةً عند عدم توفر بيانات — نُطبّعه إلى مصفوفة فارغة.
      const [firstValue] = Object.values(json ?? {});
      return (firstValue as T[] | null) ?? [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private async staggered<T>(tasks: Array<() => Promise<T[]>>, staggerMs = 150): Promise<T[]> {
    const settled = await Promise.allSettled(
      tasks.map((task, i) => new Promise<T[]>((resolve, reject) => setTimeout(() => task().then(resolve, reject), i * staggerMs)))
    );

    const results: T[] = [];
    let anySucceeded = false;
    for (const s of settled) {
      if (s.status === "fulfilled") {
        results.push(...s.value);
        anySucceeded = true;
      } else {
        console.error("[thesportsdb] a staggered request failed:", s.reason);
      }
    }
    if (!anySucceeded && tasks.length > 0) throw new TheSportsDbError("All staggered requests failed");
    return results;
  }

  async getLiveMatches(): Promise<Match[]> {
    const rows = await this.request<TsdbEvent>("/livescore.php", { s: "Soccer" }, 60);
    return rows.filter((e) => FEATURED_LEAGUE_ID_SET.has(Number(e.idLeague))).map(mapTsdbEventToMatch);
  }

  async getMatchesByDateRange(range: "today" | "tomorrow" | "week"): Promise<Match[]> {
    const revalidateSeconds = range === "week" ? 1800 : 600;
    const rows = await this.staggered(
      FEATURED_LEAGUE_ID_LIST.map((id) => () => this.request<TsdbEvent>("/eventsnextleague.php", { id }, revalidateSeconds))
    );

    const today = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today0 = startOfDay(today).getTime();
    const days = range === "today" ? [0] : range === "tomorrow" ? [1] : [0, 1, 2, 3, 4, 5, 6];

    const filtered = rows.filter((e) => {
      const eventDay = startOfDay(new Date(e.dateEvent)).getTime();
      const diffDays = Math.round((eventDay - today0) / 86400000);
      return days.includes(diffDays);
    });

    return filtered.map(mapTsdbEventToMatch);
  }

  async getRecentResults(): Promise<Match[]> {
    const rows = await this.staggered(
      FEATURED_LEAGUE_ID_LIST.map((id) => () => this.request<TsdbEvent>("/eventspastleague.php", { id }, 1800))
    );
    return rows
      .map(mapTsdbEventToMatch)
      .filter((m) => m.status === "FINISHED")
      .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
      .slice(0, 15);
  }

  async getMatchById(id: string): Promise<Match | null> {
    // نفس منطق تخفيف الحمل المطبَّق في مزوّد API-Football — مباراة منتهية لن
    // تتغيّر بياناتها، فمدة أطول هنا تقلّل الطلبات المتكرّرة بلا داعٍ.
    const [events, lineupRows] = await Promise.all([
      this.request<TsdbEvent>("/lookupevent.php", { id }, 180),
      this.request<TsdbLineupRow>("/lookuplineup.php", { id }, 900).catch(() => []),
    ]);
    if (events.length === 0) return null;

    const match = mapTsdbEventToMatch(events[0]);
    match.lineups = mapTsdbLineupToLineups(lineupRows);
    return match;
  }

  async getCompetitions(): Promise<Competition[]> {
    const entries = await this.staggered(
      Object.values(FEATURED_LEAGUE_IDS).map((id) => () => this.request<TsdbLeague>("/lookupleague.php", { id }, 3600))
    );
    return entries.map(mapTsdbLeagueToCompetition);
  }

  async getCompetitionById(id: string): Promise<Competition | null> {
    const entries = await this.request<TsdbLeague>("/lookupleague.php", { id }, 3600);
    return entries.length > 0 ? mapTsdbLeagueToCompetition(entries[0]) : null;
  }

  async getStandings(competitionId: string): Promise<StandingsEntry[]> {
    const rows = await this.request<TsdbStandingRow>(
      "/lookuptable.php",
      { l: competitionId, s: currentSeason() },
      3600
    );
    return mapTsdbStandingsToStandings(rows);
  }
}
