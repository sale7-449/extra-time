/** أشكال استجابة ESPN site-api (غير موثَّقة رسمياً لكن مستقرة وشائعة
 * الاستخدام) — الحقول المستخدمة فقط. */

export interface EspnTeamRef {
  id: string;
  displayName: string;
  shortDisplayName?: string;
  logo?: string;
}

export interface EspnCompetitor {
  id: string;
  homeAway: "home" | "away";
  team: EspnTeamRef;
  score?: string;
}

export interface EspnStatus {
  type: { state: "pre" | "in" | "post" | string; completed: boolean; name?: string };
  displayClock?: string;
  period?: number;
}

export interface EspnEvent {
  id: string;
  date: string;
  name: string;
  status: EspnStatus;
  competitions: Array<{
    id: string;
    venue?: { fullName?: string; address?: { city?: string } };
    competitors: EspnCompetitor[];
    round?: { displayName?: string };
    notes?: Array<{ headline?: string }>;
  }>;
}

export interface EspnScoreboardResponse {
  events: EspnEvent[];
  leagues?: Array<{ id: string; name: string; logos?: Array<{ href: string }> }>;
}

export interface EspnKeyEvent {
  id: string;
  type: { text: string };
  clock: { displayValue: string };
  team?: { id: string };
  participants?: Array<{ athlete: { displayName: string } }>;
}

export interface EspnRosterEntry {
  starter: boolean;
  jersey?: string;
  athlete: { displayName: string; headshot?: { href: string } };
  position?: { abbreviation?: string };
}

export interface EspnRosterTeam {
  homeAway: "home" | "away";
  team: EspnTeamRef;
  formation?: string;
  // قد يغيب فعلياً (لا مصفوفة على الإطلاق) لمباراة لم تُعلَن تشكيلتها بعد.
  roster?: EspnRosterEntry[];
}

export interface EspnBoxscoreTeamStat {
  name: string;
  displayValue: string;
}

export interface EspnBoxscoreTeam {
  team: EspnTeamRef;
  homeAway?: "home" | "away";
  statistics: EspnBoxscoreTeamStat[];
}

export interface EspnSummaryResponse {
  header?: {
    competitions?: Array<{ competitors: EspnCompetitor[]; status?: EspnStatus; date?: string }>;
  };
  keyEvents?: EspnKeyEvent[];
  rosters?: EspnRosterTeam[];
  boxscore?: { teams?: EspnBoxscoreTeam[] };
}

export interface EspnStandingEntry {
  team: EspnTeamRef;
  stats: Array<{ name: string; value: number }>;
}
