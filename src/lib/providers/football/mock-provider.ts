import type { FootballProvider } from "./types";
import { matches } from "@/lib/data/matches";
import { competitions } from "@/lib/data/competitions";
import { teams } from "@/lib/data/teams";
import type { Match, StandingsEntry } from "@/lib/types";

/** يغلّف بيانات Mock الحالية خلف واجهة FootballProvider — هو المزوّد
 * الافتراضي دائماً عند غياب مفتاح API-Football أو عند فشل الاتصال به. */
export class MockFootballProvider implements FootballProvider {
  async getLiveMatches(): Promise<Match[]> {
    return matches.filter((m) => m.status === "LIVE");
  }

  async getMatchesByDateRange(range: "today" | "tomorrow" | "week"): Promise<Match[]> {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today0 = startOfDay(now);

    return matches
      .filter((m) => m.status === "SCHEDULED")
      .filter((m) => {
        const dayDiff = Math.round((startOfDay(new Date(m.kickoff)).getTime() - today0.getTime()) / 86400000);
        if (range === "today") return dayDiff === 0;
        if (range === "tomorrow") return dayDiff === 1;
        return dayDiff >= 0 && dayDiff <= 7;
      })
      .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));
  }

  async getMatchById(id: string): Promise<Match | null> {
    return matches.find((m) => m.id === id) ?? null;
  }

  async getRecentResults(): Promise<Match[]> {
    return matches
      .filter((m) => m.status === "FINISHED")
      .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff));
  }

  async getCompetitions() {
    return Object.values(competitions);
  }

  async getCompetitionById(id: string) {
    return competitions[id] ?? null;
  }

  /** لا يوجد جدول ترتيب حقيقي في Mock — نُشتقّه تقريبياً من نتائج مباريات
   * البطولة المتوفرة بدل بيانات مختلقة كاملة، ونُعيد فارغاً إن لم توجد نتائج. */
  async getStandings(competitionId: string): Promise<StandingsEntry[]> {
    const finished = matches.filter((m) => m.competitionId === competitionId && m.status === "FINISHED");
    if (finished.length === 0) return [];

    const table = new Map<string, StandingsEntry>();
    const ensure = (teamId: string) => {
      if (!table.has(teamId)) {
        const team = teams[teamId];
        if (!team) return null;
        table.set(teamId, {
          position: 0,
          team,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
          zone: null,
        });
      }
      return table.get(teamId) ?? null;
    };

    for (const m of finished) {
      const home = ensure(m.homeTeam.id);
      const away = ensure(m.awayTeam.id);
      if (!home || !away || m.homeScore === null || m.awayScore === null) continue;

      home.played++;
      away.played++;
      home.goalsFor += m.homeScore;
      home.goalsAgainst += m.awayScore;
      away.goalsFor += m.awayScore;
      away.goalsAgainst += m.homeScore;

      if (m.homeScore > m.awayScore) {
        home.won++;
        home.points += 3;
        away.lost++;
      } else if (m.homeScore < m.awayScore) {
        away.won++;
        away.points += 3;
        home.lost++;
      } else {
        home.drawn++;
        away.drawn++;
        home.points++;
        away.points++;
      }
    }

    return [...table.values()]
      .sort((a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst))
      .map((entry, i) => ({ ...entry, position: i + 1 }));
  }
}
