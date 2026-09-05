import { footballProvider, RealDataUnavailableError } from "@/lib/providers/football";
import { canonicalCompetitionId } from "@/lib/providers/football/ids";
import { getUpcomingMatches } from "@/lib/services/matches.service";
import type { Competition, Match, StandingsEntry } from "@/lib/types";
import { getServerLocale } from "@/lib/i18n/getServerLocale";
import { localizeCompetitionName, localizeCountryName, localizeTeamName } from "@/lib/i18n/localized-names";

async function localizeCompetition(competition: Competition): Promise<Competition> {
  const locale = await getServerLocale();
  return {
    ...competition,
    name: localizeCompetitionName(competition.name, competition.id, locale),
    country: localizeCountryName(competition.country, locale),
  };
}

/** لا تبتلع RealDataUnavailableError — تُرمى للأعلى ليقرر المستدعي (Summary
 * أو صفحة) كيف يعرض حالة "تعذر التحديث" بدل قسم بطولات فارغ صامت. */
export async function getFeaturedCompetitions(): Promise<Competition[]> {
  const locale = await getServerLocale();
  const competitions = await footballProvider.getCompetitions();
  return competitions.map((c) => ({
    ...c,
    name: localizeCompetitionName(c.name, c.id, locale),
    country: localizeCountryName(c.country, locale),
  }));
}

export async function getCompetition(id: string): Promise<Competition | null> {
  try {
    const competition = await footballProvider.getCompetitionById(id);
    return competition ? localizeCompetition(competition) : null;
  } catch (error) {
    if (error instanceof RealDataUnavailableError) return null;
    throw error;
  }
}

export async function getStandings(competitionId: string): Promise<StandingsEntry[]> {
  const locale = await getServerLocale();
  try {
    const entries = await footballProvider.getStandings(competitionId);
    return entries.map((e) => ({ ...e, team: { ...e.team, name: localizeTeamName(e.team.name, locale) } }));
  } catch (error) {
    if (error instanceof RealDataUnavailableError) return [];
    throw error;
  }
}

export interface CompetitionSummary {
  competition: Competition;
  matchCount: number;
  nextMatch: Match | null;
}

export interface CompetitionsResult {
  summaries: CompetitionSummary[];
  unavailable: boolean;
}

/** يدمج بيانات البطولة مع عدد المباريات المجدولة هذا الأسبوع وأقرب مباراة قادمة.
 * `unavailable` تُميّز "لم نتمكن من الجلب" عن "لا بطولات فعلاً" — لا نعرض
 * قسم البطولات فارغاً بصمت عند فشل حقيقي في المصدر. */
export async function getCompetitionsWithSummary(): Promise<CompetitionsResult> {
  let unavailable = false;
  const [competitions, weekResult] = await Promise.all([
    getFeaturedCompetitions().catch((error) => {
      if (error instanceof RealDataUnavailableError) {
        unavailable = true;
        return [];
      }
      throw error;
    }),
    getUpcomingMatches("week"),
  ]);
  return { summaries: competitions.map((competition) => summarize(competition, weekResult.matches)), unavailable };
}

export async function getCompetitionSummary(id: string): Promise<CompetitionSummary | undefined> {
  const [competition, weekResult] = await Promise.all([getCompetition(id), getUpcomingMatches("week")]);
  if (!competition) return undefined;
  return summarize(competition, weekResult.matches);
}

function summarize(competition: Competition, weekMatches: Match[]): CompetitionSummary {
  // مقارنة عبر معرّف موحَّد (لا نصي حرفي) — البطولة والمباريات قد تصلان من
  // مصدرين مختلفين ضمن نفس التحميل (سلسلة Fallback)، فمعرّفاتهما الخام غير
  // متطابقة نصياً حتى لو كانتا لنفس البطولة الحقيقية.
  const canonicalId = canonicalCompetitionId(competition.id);
  const competitionMatches = weekMatches.filter((m) =>
    canonicalId ? canonicalCompetitionId(m.competitionId) === canonicalId : m.competitionId === competition.id
  );
  const nextMatch = competitionMatches.sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))[0] ?? null;

  return { competition, matchCount: competitionMatches.length, nextMatch };
}
