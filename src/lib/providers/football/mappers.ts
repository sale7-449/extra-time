import type {
  Competition,
  LineupPlayer,
  Match,
  MatchEvent,
  MatchEventType,
  MatchStatKey,
  MatchStatLine,
  MatchStatus,
  StandingsEntry,
  Team,
  TeamLineup,
} from "@/lib/types";
import type {
  ApiEvent,
  ApiFixture,
  ApiLeague,
  ApiLineupPlayer,
  ApiStandingRow,
  ApiTeam,
  ApiTeamLineup,
  ApiTeamStatistics,
} from "./api-football-types";
import { tagId } from "./ids";
import { normalizePositionCode } from "./position";

/**
 * كل ما يعرف شكل استجابة API-Football محصور في هذا الملف. Match/Team/
 * Competition في بقية المشروع تبقى كما هي دائماً بغض النظر عن مصدر البيانات.
 */

const STATUS_MAP: Record<string, MatchStatus> = {
  NS: "SCHEDULED",
  TBD: "SCHEDULED",
  "1H": "LIVE",
  HT: "LIVE",
  "2H": "LIVE",
  ET: "LIVE",
  BT: "LIVE",
  P: "LIVE",
  SUSP: "LIVE",
  INT: "LIVE",
  LIVE: "LIVE",
  FT: "FINISHED",
  AET: "FINISHED",
  PEN: "FINISHED",
  PST: "POSTPONED",
  CANC: "CANCELLED",
  ABD: "CANCELLED",
  AWD: "CANCELLED",
  WO: "CANCELLED",
};

const EVENT_TYPE_MAP: Record<string, MatchEventType> = {
  Goal: "GOAL",
  subst: "SUBSTITUTION",
};

export function mapApiTeamToTeam(team: ApiTeam): Team {
  return {
    id: tagId("af", team.id),
    name: team.name,
    shortName: team.name.slice(0, 3).toUpperCase(),
    logoUrl: team.logo,
    country: team.country ?? "",
  };
}

export function mapApiFixtureToMatch(fixture: ApiFixture): Match {
  return {
    id: tagId("af", fixture.fixture.id),
    competitionId: tagId("af", fixture.league.id),
    round: fixture.league.round ?? undefined,
    venue: fixture.fixture.venue?.name ?? undefined,
    city: fixture.fixture.venue?.city ?? undefined,
    referee: fixture.fixture.referee ?? undefined,
    status: STATUS_MAP[fixture.fixture.status.short] ?? "SCHEDULED",
    kickoff: fixture.fixture.date,
    minute: fixture.fixture.status.elapsed ?? undefined,
    homeTeam: mapApiTeamToTeam(fixture.teams.home),
    awayTeam: mapApiTeamToTeam(fixture.teams.away),
    homeScore: fixture.goals.home,
    awayScore: fixture.goals.away,
    events: [],
    stats: [],
  };
}

export function mapApiEventsToEvents(events: ApiEvent[]): MatchEvent[] {
  return events
    .filter((e) => e.type === "Goal" || e.type === "subst" || e.type === "Card")
    .map((e, i) => {
      const type: MatchEventType =
        e.type === "Card" ? (e.detail.toLowerCase().includes("red") ? "RED_CARD" : "YELLOW_CARD") : EVENT_TYPE_MAP[e.type] ?? "GOAL";

      return {
        id: `${e.time.elapsed}-${i}`,
        minute: e.time.elapsed,
        extraMinute: e.time.extra ?? undefined,
        type,
        teamId: tagId("af", e.team.id),
        playerName: e.player.name ?? "—",
        assistName: e.assist.name ?? undefined,
        // نفس حقل detail المُستخدَم أصلاً للتبديل — يحمل الآن نوع الهدف أيضاً
        // حين يكون فعلاً مذكوراً في المصدر ("Penalty") لا نوعاً افتراضياً
        // ("Normal Goal" غير مفيد للعرض، و"Own Goal" مُعلَّم أصلاً عبر isOwnGoal).
        detail: e.type === "subst" ? e.detail : e.type === "Goal" && e.detail === "Penalty" ? "Penalty" : undefined,
        // API-Football يُميّز الهدف العكسي عبر detail بالضبط ("Own Goal" مقابل
        // "Normal Goal"/"Penalty") — لا تخمين، فقط قراءة القيمة الموثَّقة.
        isOwnGoal: e.type === "Goal" && e.detail === "Own Goal",
      };
    });
}

const STAT_TYPE_TO_KEY: Record<string, MatchStatKey> = {
  "Ball Possession": "possession",
  "Total Shots": "shots",
  "Shots on Goal": "shotsOnTarget",
  "Corner Kicks": "corners",
  Fouls: "fouls",
  Offsides: "offsides",
  "Total passes": "passes",
  "Passes %": "passAccuracy",
  "Yellow Cards": "yellowCards",
  "Red Cards": "redCards",
};

export function mapApiStatisticsToStats(teamStats: ApiTeamStatistics[]): MatchStatLine[] {
  if (teamStats.length < 2) return [];
  const [home, away] = teamStats;

  return Object.entries(STAT_TYPE_TO_KEY)
    .map(([apiType, key]): MatchStatLine | null => {
      const homeItem = home.statistics.find((s) => s.type === apiType);
      const awayItem = away.statistics.find((s) => s.type === apiType);
      if (!homeItem && !awayItem) return null;

      const parse = (v: number | string | null) => (typeof v === "string" ? parseInt(v.replace("%", ""), 10) || 0 : v ?? 0);

      return {
        key,
        home: parse(homeItem?.value ?? 0),
        away: parse(awayItem?.value ?? 0),
        isPercentage: apiType === "Ball Possession" || apiType === "Passes %",
      };
    })
    .filter((s): s is MatchStatLine => s !== null);
}

export function mapApiLineupsToLineups(lineups: ApiTeamLineup[]): { home: TeamLineup; away: TeamLineup } | undefined {
  if (lineups.length < 2) return undefined;
  const toPlayers = (players: ApiLineupPlayer[]): LineupPlayer[] =>
    players.map((p) => ({
      number: p.player.number,
      name: p.player.name,
      position: normalizePositionCode(p.player.pos),
      grid: p.player.grid,
      photoUrl: p.player.photo ?? null,
    }));
  const toTeamLineup = (lineup: ApiTeamLineup): TeamLineup => ({
    formation: lineup.formation ?? undefined,
    coach: lineup.coach?.name ?? undefined,
    startXI: toPlayers(lineup.startXI),
    substitutes: toPlayers(lineup.substitutes),
  });

  return { home: toTeamLineup(lineups[0]), away: toTeamLineup(lineups[1]) };
}

export function mapApiLeagueToCompetition(entry: ApiLeague): Competition {
  // ألوان ثابتة مشتقة من معرّف البطولة حتى تبقى الهوية اللونية متسقة بين عمليات الجلب.
  const palette: Array<[string, string]> = [
    ["#1f6b3a", "#0f3320"],
    ["#3a1f6b", "#1c0f33"],
    ["#6b1f2f", "#330f17"],
    ["#1f3d6b", "#0f1e33"],
    ["#6b5a1f", "#332b0f"],
    ["#6b1f1f", "#330f0f"],
  ];
  const [colorFrom, colorTo] = palette[entry.league.id % palette.length];

  return {
    id: tagId("af", entry.league.id),
    name: entry.league.name,
    shortName: entry.league.name,
    country: entry.country.name,
    logoUrl: entry.league.logo,
    colorFrom,
    colorTo,
  };
}

export function mapApiStandingsToStandings(rows: ApiStandingRow[]): StandingsEntry[] {
  return rows.map((row) => ({
    position: row.rank,
    team: mapApiTeamToTeam(row.team),
    played: row.all.played,
    won: row.all.win,
    drawn: row.all.draw,
    lost: row.all.lose,
    goalsFor: row.all.goals.for,
    goalsAgainst: row.all.goals.against,
    points: row.points,
    zone: row.rank <= 4 ? "CONTINENTAL" : rows.length - row.rank < 3 ? "RELEGATION" : null,
  }));
}
