/** أشكال استجابة TheSportsDB v1 — الحقول المستخدمة فقط. */

export interface TsdbEvent {
  idEvent: string;
  strEvent: string;
  idLeague: string;
  strLeague: string;
  strSeason: string;
  intRound: string | null;
  dateEvent: string;
  strTime: string | null;
  strTimestamp: string | null;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam: string;
  idAwayTeam: string;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strVenue: string | null;
  strCity: string | null;
  strCountry: string | null;
  strStatus: string | null;
  strOfficial?: string | null;
}

export interface TsdbLeague {
  idLeague: string;
  strLeague: string;
  strLeagueAlternate?: string | null;
  strCountry: string | null;
  strBadge?: string | null;
  strLogo?: string | null;
}

export interface TsdbStandingRow {
  idTeam: string;
  strTeam: string;
  strBadge: string | null;
  intRank: string;
  intPlayed: string;
  intWin: string;
  intDraw: string;
  intLoss: string;
  intGoalsFor: string;
  intGoalsAgainst: string;
  intPoints: string;
}

export interface TsdbLineupRow {
  idEvent: string;
  strPosition: string | null;
  strHome: "Yes" | "No";
  strSubstitute: "Yes" | "No";
  intSquadNumber: string | null;
  idPlayer: string;
  strPlayer: string;
  idTeam: string;
  strTeam: string;
  strCutout?: string | null;
}
