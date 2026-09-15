/** أشكال استجابة API-Football v3 (v3.football.api-sports.io) — الحقول المستخدمة فقط. */

export interface ApiTeam {
  id: number;
  name: string;
  logo: string | null;
  country?: string;
}

export interface ApiFixtureStatus {
  long: string;
  short: string;
  elapsed: number | null;
}

export interface ApiFixture {
  fixture: {
    id: number;
    referee: string | null;
    date: string;
    status: ApiFixtureStatus;
    venue: { name: string | null; city?: string | null };
  };
  league: { id: number; name: string; round: string | null; country: string; logo: string | null };
  teams: { home: ApiTeam; away: ApiTeam };
  goals: { home: number | null; away: number | null };
}

export interface ApiEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: "Goal" | "Card" | "subst" | string;
  detail: string;
}

export interface ApiStatItem {
  type: string;
  value: number | string | null;
}

export interface ApiTeamStatistics {
  team: { id: number };
  statistics: ApiStatItem[];
}

export interface ApiLineupPlayer {
  player: { id: number; number: number; name: string; pos: string | null; grid: string | null; photo?: string | null };
}

export interface ApiTeamLineup {
  team: { id: number };
  coach?: { name: string | null } | null;
  formation?: string | null;
  startXI: ApiLineupPlayer[];
  substitutes: ApiLineupPlayer[];
}

export interface ApiLeague {
  league: { id: number; name: string; type: string; logo: string | null };
  country: { name: string };
}

export interface ApiStandingRow {
  rank: number;
  team: ApiTeam;
  points: number;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

export interface ApiResponse<T> {
  response: T[];
  results: number;
  // API-Football يُعيد 200 OK حتى عند تحديد المعدّل (Rate Limit) — الخطأ
  // الحقيقي يظهر هنا فقط، وليس في حالة HTTP. قد يكون Array أو Object.
  errors?: unknown[] | Record<string, string>;
}
