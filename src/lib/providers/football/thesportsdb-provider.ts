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

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** نافذة تواريخ (ماضٍ قريب + مستقبل قريب) تُستخدم لاكتشاف أي بطولة حقيقية
 * نشطة الآن عبر eventsday.php — بلا أي قائمة معرّفات بطولات ثابتة مسبقاً. */
function dateWindow(pastDays: number, futureDays: number): string[] {
  const dates: string[] = [];
  for (let i = -pastDays; i <= futureDays; i++) dates.push(isoDate(i));
  return dates;
}

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

  /** eventsday.php لعدّة تواريخ معاً — كل مباريات كرة القدم لأي بطولة حقيقية
   * في هذا اليوم، بلا حاجة لمعرفة معرّف البطولة مسبقاً. نقطة مشتركة يعيد
   * استخدامها getMatchesByDateRange وgetRecentResults وgetCompetitions. */
  private async fetchEventsForDates(dates: string[], revalidateSeconds: number): Promise<TsdbEvent[]> {
    return this.staggered(dates.map((d) => () => this.request<TsdbEvent>("/eventsday.php", { d, s: "Soccer" }, revalidateSeconds)));
  }

  async getLiveMatches(): Promise<Match[]> {
    // بلا فلتر بطولات — livescore.php يُعيد أصلاً كل المباريات المباشرة الحقيقية.
    const rows = await this.request<TsdbEvent>("/livescore.php", { s: "Soccer" }, 60);
    return rows.map(mapTsdbEventToMatch);
  }

  async getMatchesByDateRange(range: "today" | "tomorrow" | "week"): Promise<Match[]> {
    const revalidateSeconds = range === "week" ? 1800 : 600;
    const days = range === "today" ? [0] : range === "tomorrow" ? [1] : [0, 1, 2, 3, 4, 5, 6];
    const dates = days.map((offset) => isoDate(offset));
    const rows = await this.fetchEventsForDates(dates, revalidateSeconds);
    return rows.map(mapTsdbEventToMatch);
  }

  async getRecentResults(): Promise<Match[]> {
    // بحث بالتاريخ (آخر 5 أيام) بدل استعلام لكل بطولة على حدة — يلتقط نتيجة
    // أي بطولة حقيقية منتهية بلا حاجة لمعرفة معرّفها مسبقاً.
    const dates = dateWindow(5, 0).filter((d) => d !== isoDate(0));
    const rows = await this.fetchEventsForDates(dates, 1800);
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
    // مُشتقّة من البطولات التي تملك فعلياً مباريات ضمن نافذة واقعية (خمسة أيام
    // ماضية إلى أسبوع قادم) — لا قائمة معرّفات ثابتة، فأي بطولة حقيقية جديدة
    // (خليجية أو غيرها) تظهر تلقائياً. شارة/شعار البطولة الحقيقي غير متوفر في
    // eventsday.php نفسها، فنجلبه بعد ذلك لكل معرّف بطولة اكتُشِف فعلياً عبر
    // lookupleague.php — بلا أي قائمة معرّفات مكتوبة يدوياً في الكود.
    const dates = dateWindow(5, 7);
    const rows = await this.fetchEventsForDates(dates, 3600);
    const leagueIds = [...new Set(rows.map((r) => r.idLeague))];

    const entries = await this.staggered(
      leagueIds.map((id) => () => this.request<TsdbLeague>("/lookupleague.php", { id }, 3600))
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
