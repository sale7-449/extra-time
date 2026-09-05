import type { Competition, Match, StandingsEntry } from "@/lib/types";

/**
 * الواجهة الوحيدة التي تعتمد عليها طبقة Services لجلب بيانات كرة القدم.
 * لا تعرف Services ولا Components أي شيء عن API-Football أو أي مصدر آخر —
 * فقط عن هذه الواجهة. استبدال المزوّد لاحقاً (مصدر آخر، أو نسخة مدفوعة أوسع
 * تغطية) لا يغيّر أي كود فوقها.
 *
 * تنفَّذ فقط العمليات التي تحتاجها الواجهة الحالية فعلياً — لا Endpoints
 * إضافية بلا استخدام حقيقي.
 */
export interface FootballProvider {
  getLiveMatches(): Promise<Match[]>;
  getMatchesByDateRange(range: "today" | "tomorrow" | "week"): Promise<Match[]>;
  getRecentResults(): Promise<Match[]>;
  getMatchById(id: string): Promise<Match | null>;
  getCompetitions(): Promise<Competition[]>;
  getCompetitionById(id: string): Promise<Competition | null>;
  getStandings(competitionId: string): Promise<StandingsEntry[]>;
}
