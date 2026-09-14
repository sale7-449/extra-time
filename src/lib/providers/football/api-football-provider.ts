import type { FootballProvider } from "./types";
import type { Competition, Match, StandingsEntry } from "@/lib/types";
import type {
  ApiEvent,
  ApiFixture,
  ApiLeague,
  ApiResponse,
  ApiStandingRow,
  ApiTeamLineup,
  ApiTeamStatistics,
} from "./api-football-types";
import {
  mapApiEventsToEvents,
  mapApiFixtureToMatch,
  mapApiLeagueToCompetition,
  mapApiLineupsToLineups,
  mapApiStandingsToStandings,
  mapApiStatisticsToStats,
} from "./mappers";
import { CATALOG_AF_IDS } from "./competition-catalog";

const BASE_URL = "https://v3.football.api-sports.io";

const CURRENT_SEASON = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;

const CATALOG_AF_ID_SET = new Set<number>(CATALOG_AF_IDS);

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export class ApiFootballError extends Error {}

export class ApiFootballProvider implements FootballProvider {
  constructor(private readonly apiKey: string) {}

  private async request<T>(path: string, params: Record<string, string | number> = {}, revalidateSeconds = 60): Promise<T[]> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        headers: { "x-apisports-key": this.apiKey },
        signal: controller.signal,
        next: { revalidate: revalidateSeconds },
      });

      if (!response.ok) {
        throw new ApiFootballError(`API-Football request failed: ${response.status}`);
      }

      const json = (await response.json()) as ApiResponse<T>;

      const hasErrors = Array.isArray(json.errors) ? json.errors.length > 0 : Boolean(json.errors && Object.keys(json.errors).length > 0);
      if (hasErrors) {
        // غالباً Rate Limit — الطلبات المتوازية الكثيرة على الفئة المجانية.
        // نرميه كخطأ حقيقي بدل اعتباره "لا توجد نتائج" بصمت.
        throw new ApiFootballError(`API-Football returned errors: ${JSON.stringify(json.errors)}`);
      }

      return json.response ?? [];
    } finally {
      clearTimeout(timeout);
    }
  }

  /** طلبات /fixtures?date=X لعدّة تواريخ معاً، مفلترة على كتالوج البطولات
   * المُختارة فقط (COMPETITION_CATALOG) — لا مباريات من بطولات عشوائية حول
   * العالم لمجرد أن لها مباراة في هذا التاريخ. */
  private async fetchFixturesForDates(dates: string[], revalidateSeconds: number): Promise<ApiFixture[]> {
    const fixtures = await this.staggered(
      dates.map((date) => () => this.request<ApiFixture>("/fixtures", { date }, revalidateSeconds))
    );
    return fixtures.filter((f) => CATALOG_AF_ID_SET.has(f.league.id));
  }

  /** يُشغّل عدة طلبات مع فارق زمني بسيط بين كل بداية (لا كلها دفعة واحدة)
   * لتقليل احتمال تحديد المعدّل (Rate Limit) على الفئة المجانية، ويكمل
   * بالنتائج الناجحة فقط بدل إسقاط كل شيء بسبب فشل طلب واحد. */
  private async staggered<T>(tasks: Array<() => Promise<T[]>>, staggerMs = 180): Promise<T[]> {
    const settled = await Promise.allSettled(
      tasks.map(
        (task, i) =>
          new Promise<T[]>((resolve, reject) => {
            setTimeout(() => task().then(resolve, reject), i * staggerMs);
          })
      )
    );

    const results: T[] = [];
    let anySucceeded = false;
    for (const s of settled) {
      if (s.status === "fulfilled") {
        results.push(...s.value);
        anySucceeded = true;
      } else {
        console.error("[api-football] a staggered request failed:", s.reason);
      }
    }

    // فشل كل الطلبات معاً (مثلاً Rate Limit شامل) يعني عدم توفر بيانات حقيقية
    // إطلاقاً — نرميه كخطأ حقيقي بدل إرجاع [] بصمت (قد يُقرأ كـ "لا نتائج" بدل
    // "تعذّر الجلب"). فشل جزئي (بعض الطلبات فقط) يبقى مقبولاً كما هو مصمَّم.
    if (!anySucceeded && tasks.length > 0) {
      throw new ApiFootballError("All staggered requests failed");
    }

    return results;
  }

  async getLiveMatches(): Promise<Match[]> {
    // 60 ثانية بدل 30 — لا تزال "شبه فورية"، لكن تُخفّض استهلاك الحصة اليومية
    // المحدودة إلى النصف لهذا المسار الأكثر استدعاءً (يُستطلَع من العميل كل 40ث).
    const fixtures = await this.request<ApiFixture>("/fixtures", { live: "all" }, 60);
    return fixtures.filter((f) => CATALOG_AF_ID_SET.has(f.league.id)).map(mapApiFixtureToMatch);
  }

  async getMatchesByDateRange(range: "today" | "tomorrow" | "week"): Promise<Match[]> {
    const days = range === "today" ? [0] : range === "tomorrow" ? [1] : [0, 1, 2, 3, 4, 5, 6];
    const dates = days.map((offset) => isoDate(offset));

    // "week" يستهلك 7 طلبات لكل دورة تخزين مؤقت — مدة أطول تعوّض التكلفة
    // الأعلى وتحمي حصة اليوم المجانية من النفاد بسرعة.
    const revalidateSeconds = range === "week" ? 1800 : 600;
    const fixtures = await this.fetchFixturesForDates(dates, revalidateSeconds);
    return fixtures.map(mapApiFixtureToMatch);
  }

  async getRecentResults(): Promise<Match[]> {
    // last يُطبَّق لكل بطولة على حدة من كتالوج البطولات المُختار — كأس قد لا
    // يكون له أي مباراة ضمن نافذة تاريخ قصيرة، فالاستعلام المباشر بمعرّف
    // البطولة أوثق من اكتشاف عبر تواريخ. نتائج منتهية لا تتغيّر بسرعة، فتخزين
    // مؤقت أطول (30 دقيقة) مقبول تماماً هنا.
    const fixtures = await this.staggered(
      CATALOG_AF_IDS.map(
        (league) => () => this.request<ApiFixture>("/fixtures", { league, season: CURRENT_SEASON, last: 5 }, 1800)
      )
    );
    return fixtures
      .map(mapApiFixtureToMatch)
      .filter((m) => m.status === "FINISHED")
      .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
      .slice(0, 15);
  }

  async getMatchById(id: string): Promise<Match | null> {
    // كل زيارة لصفحة مباراة (حتى مباراة منتهية منذ أسابيع لن تتغيّر بياناتها
    // أبداً) كانت تُعيد جلب 3-4 طلبات من الحصة اليومية المحدودة كل 60 ثانية —
    // مدد أطول هنا تخفّض الاستهلاك دون التضحية بحداثة مباراة مباشرة فعلاً
    // (المباريات المباشرة تُحدَّث أصلاً من getLiveMatches كل 60 ثانية).
    const [fixtures, events, statistics, lineups] = await Promise.all([
      this.request<ApiFixture>("/fixtures", { id }, 180),
      this.request<ApiEvent>("/fixtures/events", { fixture: id }, 180).catch(() => []),
      this.request<ApiTeamStatistics>("/fixtures/statistics", { fixture: id }, 300).catch(() => []),
      this.request<ApiTeamLineup>("/fixtures/lineups", { fixture: id }, 900).catch(() => []),
    ]);

    if (fixtures.length === 0) return null;

    const match = mapApiFixtureToMatch(fixtures[0]);
    match.events = mapApiEventsToEvents(events);
    match.stats = mapApiStatisticsToStats(statistics);
    match.lineups = mapApiLineupsToLineups(lineups);
    return match;
  }

  async getCompetitions(): Promise<Competition[]> {
    // استعلام مباشر بمعرّفات الكتالوج المُختار يدوياً (COMPETITION_CATALOG) —
    // يُعيد بيانات البطولة الحقيقية دائماً بغضّ النظر عن وجود مباراة هذا
    // الأسبوع تحديداً أو لا (كأس قد يكون بين جولتين)، بلا اكتشاف عشوائي من
    // نتائج مباريات قد يُدخل بطولات غير مهمة لمجرد أن لها مباراة اليوم.
    const entries = await this.staggered(
      CATALOG_AF_IDS.map((id) => () => this.request<ApiLeague>("/leagues", { id }, 3600))
    );
    return entries.map(mapApiLeagueToCompetition);
  }

  async getCompetitionById(id: string): Promise<Competition | null> {
    const entries = await this.request<ApiLeague>("/leagues", { id }, 3600);
    return entries.length > 0 ? mapApiLeagueToCompetition(entries[0]) : null;
  }

  async getStandings(competitionId: string): Promise<StandingsEntry[]> {
    const entries = await this.request<{ league: { standings: ApiStandingRow[][] } }>(
      "/standings",
      { league: competitionId, season: CURRENT_SEASON },
      3600
    );
    const rows = entries[0]?.league?.standings?.[0] ?? [];
    return mapApiStandingsToStandings(rows);
  }
}
