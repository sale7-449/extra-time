import { footballProvider, RealDataUnavailableError } from "@/lib/providers/football";
import { canonicalCompetitionId, tagId } from "@/lib/providers/football/ids";
import { COMPETITION_CATALOG, type CatalogEntry } from "@/lib/providers/football/competition-catalog";
import { competitionPalette } from "@/lib/providers/football/mappers";
import { getUpcomingMatches } from "@/lib/services/matches.service";
import type { Competition, Match, StandingsEntry } from "@/lib/types";
import type { Locale } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/getServerLocale";
import { localizeCompetitionName, localizeCompetitionShortName, localizeCountryName } from "@/lib/i18n/localized-names";
import { getDisplayTeamName } from "@/lib/i18n/sports-names";

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
    return entries.map((e) => ({ ...e, team: { ...e.team, name: getDisplayTeamName(e.team.id, e.team.name, locale) } }));
  } catch (error) {
    if (error instanceof RealDataUnavailableError) return [];
    throw error;
  }
}

export interface CompetitionSummary {
  competition: Competition;
  matchCount: number;
  nextMatch: Match | null;
  /** true = هذه بطاقة بديلة من الكتالوج الثابت (لا بيانات حية) لأن كل
   * مصادر البيانات الحقيقية فشلت لهذه البطولة تحديداً — الاسم حقيقي وموثَّق
   * (نفس قاموس الأسماء المُستخدَم للبطولة الحية)، لكن لا شعار/عدد
   * مباريات/مباراة قادمة حقيقية متاحة الآن، فتبقى `matchCount: 0` و
   * `nextMatch: null` (صحيحة حرفياً: لا نملك أي بيانات، لا صفر مُختلَق). */
  unavailable?: boolean;
}

export interface CompetitionsResult {
  summaries: CompetitionSummary[];
  unavailable: boolean;
}

export interface CompetitionPageData {
  competition: Competition;
  unavailable: boolean;
}

/** بطاقة بديلة لبطولة من الكتالوج الثابت حين يتعذّر جلبها حياً من كل
 * المصادر — تُبنى حصراً من: (1) معرّف حقيقي من الكتالوج نفسه (afId/tsdbId)،
 * (2) اسم عربي/إنجليزي حقيقي موثَّق مسبقاً عبر نفس قاموس
 * localizeCompetitionName المُستخدَم للمسار الحي (لا اسم جديد يُختلَق هنا)،
 * (3) نفس دالة الألوان الحتمية المُستخدَمة للبطاقة الحية (نفس المعرّف =
 * نفس اللون دائماً). `logoUrl: null` يجعل CompetitionLogo يعرض أيقونة الكأس
 * العامة تلقائياً (سلوكها الموجود أصلاً لغياب الشعار) — لا شعار مُختلَق،
 * و`country: ""` بدل اختلاق اسم دولة لا نملك مصدراً حقيقياً له الآن. */
function buildPlaceholderCompetition(entry: CatalogEntry, locale: Locale): Competition {
  // كل عنصر في الكتالوج الحالي يملك afId فعلياً؛ الاحتياط على tsdbId هنا
  // نظري بحت (حراسة نوع لا سيناريو واقعي) كي تبقى الدالة صالحة لو أُضيفت
  // مستقبلاً بطولة بـtsdbId فقط بلا afId، بلا حاجة لتعديلها حينها.
  const numericId = entry.afId ?? entry.tsdbId ?? 0;
  const id = entry.afId !== undefined ? tagId("af", entry.afId) : tagId("tsdb", entry.tsdbId!);
  const name = localizeCompetitionName(String(numericId), numericId, locale);
  const [colorFrom, colorTo] = competitionPalette(numericId);

  return {
    id,
    name,
    shortName: localizeCompetitionShortName(id, locale) ?? name,
    country: "",
    logoUrl: null,
    colorFrom,
    colorTo,
  };
}

/** يدمج بيانات البطولة مع عدد المباريات المجدولة هذا الأسبوع وأقرب مباراة قادمة.
 * `unavailable` تُميّز "لم نتمكن من الجلب" عن "لا بطولات فعلاً" — لا نعرض
 * قسم البطولات فارغاً بصمت عند فشل حقيقي في المصدر. */
export async function getCompetitionsWithSummary(): Promise<CompetitionsResult> {
  const locale = await getServerLocale();
  const [liveCompetitions, weekResult] = await Promise.all([
    getFeaturedCompetitions().catch((error) => {
      if (error instanceof RealDataUnavailableError) return [];
      throw error;
    }),
    getUpcomingMatches("week"),
  ]);

  // فهرسة بمعرّف موحَّد (لا نصي حرفي) — البطولة الحية قد تصل بمعرّف af أو
  // tsdb حسب أي مصدر نجح، بينما عناصر الكتالوج مُعرَّفة دائماً بـafId.
  const liveByCanonicalId = new Map(liveCompetitions.map((c) => [canonicalCompetitionId(c.id) ?? c.id, c] as const));

  // القيادة الآن من الكتالوج الثابت (12 بطولة دائماً)، لا من نتيجة الجلب
  // الحي وحدها — بطولة بلا نتيجة حية تُعرض كبطاقة بديلة بدل الاختفاء تماماً.
  const summaries: CompetitionSummary[] = COMPETITION_CATALOG.map((entry) => {
    const live = entry.afId !== undefined ? liveByCanonicalId.get(String(entry.afId)) : undefined;
    if (live) return summarize(live, weekResult.matches);
    return { competition: buildPlaceholderCompetition(entry, locale), matchCount: 0, nextMatch: null, unavailable: true };
  });

  return { summaries, unavailable: summaries.every((s) => s.unavailable) };
}

export async function getCompetitionSummary(id: string): Promise<CompetitionSummary | undefined> {
  const [competition, weekResult] = await Promise.all([getCompetition(id), getUpcomingMatches("week")]);
  if (!competition) return undefined;
  return summarize(competition, weekResult.matches);
}

/** نسخة "صفحة تفاصيل البطولة" من `getCompetition` — إن فشل الجلب الحي لكن
 * الـid ينتمي فعلاً لأحد الـ12 في الكتالوج، تُعاد بطاقة بديلة بدل null (كي
 * تعرض الصفحة "لا توجد بيانات متاحة حالياً" بدل notFound() المُضلِّلة).
 * `notFound()` الحقيقي يبقى محصوراً بمعرّف لا ينتمي للكتالوج إطلاقاً. */
export async function getCompetitionForDetailPage(id: string): Promise<CompetitionPageData | null> {
  const real = await getCompetition(id);
  if (real) return { competition: real, unavailable: false };

  const locale = await getServerLocale();
  const canonicalId = canonicalCompetitionId(id);
  const entry = COMPETITION_CATALOG.find((e) => e.afId !== undefined && String(e.afId) === canonicalId);
  if (!entry) return null;

  return { competition: buildPlaceholderCompetition(entry, locale), unavailable: true };
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
