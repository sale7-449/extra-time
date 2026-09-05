import type { Competition, LineupPlayer, Match, MatchStatus, StandingsEntry, Team, TeamLineup } from "@/lib/types";
import type { TsdbEvent, TsdbLeague, TsdbLineupRow, TsdbStandingRow } from "./thesportsdb-types";
import { tagId } from "./ids";
import { normalizePositionCode } from "./position";

/**
 * كل ما يعرف شكل استجابة TheSportsDB محصور في هذا الملف — تماماً كنظير
 * API-Football. لا أحداث (أهداف/بطاقات) ولا إحصائيات مباراة (استحواذ/
 * تسديدات) في الفئة المجانية من TheSportsDB — تُترك [] بصدق بدل اختلاقها،
 * والواجهة تعرض حالتها الفارغة المعتمدة أصلاً بدل ذلك.
 */

const STATUS_MAP: Record<string, MatchStatus> = {
  NS: "SCHEDULED",
  "1H": "LIVE",
  HT: "LIVE",
  "2H": "LIVE",
  ET: "LIVE",
  BT: "LIVE",
  P: "LIVE",
  LIVE: "LIVE",
  FT: "FINISHED",
  AET: "FINISHED",
  PEN: "FINISHED",
  PST: "POSTPONED",
  CANC: "CANCELLED",
  ABD: "CANCELLED",
};

function toTeam(id: string, name: string, badge: string | null): Team {
  return {
    id: tagId("tsdb", id),
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    logoUrl: badge,
    country: "",
  };
}

export function mapTsdbEventToMatch(event: TsdbEvent): Match {
  const homeScore = event.intHomeScore !== null && event.intHomeScore !== "" ? Number(event.intHomeScore) : null;
  const awayScore = event.intAwayScore !== null && event.intAwayScore !== "" ? Number(event.intAwayScore) : null;
  const kickoff = event.strTimestamp
    ? new Date(event.strTimestamp).toISOString()
    : new Date(`${event.dateEvent}T${event.strTime ?? "00:00:00"}Z`).toISOString();

  return {
    id: tagId("tsdb", event.idEvent),
    competitionId: tagId("tsdb", event.idLeague),
    round: event.intRound ?? undefined,
    venue: event.strVenue ?? undefined,
    city: event.strCity || undefined,
    referee: event.strOfficial || undefined,
    status: STATUS_MAP[event.strStatus ?? "NS"] ?? "SCHEDULED",
    kickoff,
    homeTeam: toTeam(event.idHomeTeam, event.strHomeTeam, event.strHomeTeamBadge),
    awayTeam: toTeam(event.idAwayTeam, event.strAwayTeam, event.strAwayTeamBadge),
    homeScore,
    awayScore,
    events: [],
    stats: [],
  };
}

export function mapTsdbLeagueToCompetition(league: TsdbLeague): Competition {
  const palette: Array<[string, string]> = [
    ["#1f6b3a", "#0f3320"],
    ["#3a1f6b", "#1c0f33"],
    ["#6b1f2f", "#330f17"],
    ["#1f3d6b", "#0f1e33"],
    ["#6b5a1f", "#332b0f"],
    ["#6b1f1f", "#330f0f"],
  ];
  const [colorFrom, colorTo] = palette[Number(league.idLeague) % palette.length];

  return {
    id: tagId("tsdb", league.idLeague),
    name: league.strLeague,
    shortName: league.strLeague,
    country: league.strCountry ?? "",
    logoUrl: league.strBadge ?? league.strLogo ?? null,
    colorFrom,
    colorTo,
  };
}

export function mapTsdbStandingsToStandings(rows: TsdbStandingRow[]): StandingsEntry[] {
  return rows.map((row) => ({
    position: Number(row.intRank),
    team: toTeam(row.idTeam, row.strTeam, row.strBadge),
    played: Number(row.intPlayed),
    won: Number(row.intWin),
    drawn: Number(row.intDraw),
    lost: Number(row.intLoss),
    goalsFor: Number(row.intGoalsFor),
    goalsAgainst: Number(row.intGoalsAgainst),
    points: Number(row.intPoints),
    zone: Number(row.intRank) <= 4 ? "CONTINENTAL" : rows.length - Number(row.intRank) < 3 ? "RELEGATION" : null,
  }));
}

export function mapTsdbLineupToLineups(rows: TsdbLineupRow[]): { home: TeamLineup; away: TeamLineup } | undefined {
  if (rows.length === 0) return undefined;

  const toPlayer = (r: TsdbLineupRow): LineupPlayer => ({
    number: r.intSquadNumber ? Number(r.intSquadNumber) : 0,
    name: r.strPlayer,
    position: normalizePositionCode(r.strPosition),
    photoUrl: r.strCutout ?? null,
  });

  const homeRows = rows.filter((r) => r.strHome === "Yes");
  const awayRows = rows.filter((r) => r.strHome === "No");
  if (homeRows.length === 0 || awayRows.length === 0) return undefined;

  const toLineup = (teamRows: TsdbLineupRow[]): TeamLineup => ({
    startXI: teamRows.filter((r) => r.strSubstitute !== "Yes").map(toPlayer),
    substitutes: teamRows.filter((r) => r.strSubstitute === "Yes").map(toPlayer),
  });

  return { home: toLineup(homeRows), away: toLineup(awayRows) };
}
