import { footballProvider, RealDataUnavailableError } from "@/lib/providers/football";
import { getLatestNews } from "@/lib/services/news.service";
import type { HomeStats, Match } from "@/lib/types";

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function sumGoals(list: Match[]): number {
  return list.reduce((sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0);
}

/** أرقام تجميعية فقط (عدّاد)، لا تعرض مباراة بعينها — عند تعذّر مصدر حقيقي
 * نتعامل معه كمساهمة صفرية بدل تعطيل الصفحة بالكامل. */
async function safeList<T>(promise: Promise<T[]>): Promise<T[]> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof RealDataUnavailableError) return [];
    throw error;
  }
}

/**
 * كل رقم هنا مُشتق فعلياً من استدعاءات footballProvider — لا بيانات
 * مختلقة، ولا قراءة مباشرة لملفات Mock. يعمل بنفس المنطق تماماً سواء كان
 * المصدر Mock أو API-Football حقيقياً.
 */
export async function getHomeStats(): Promise<HomeStats> {
  const [live, todayFixtures, results, competitions, news] = await Promise.all([
    safeList(footballProvider.getLiveMatches()),
    safeList(footballProvider.getMatchesByDateRange("today")),
    safeList(footballProvider.getRecentResults()),
    safeList(footballProvider.getCompetitions()),
    getLatestNews(20),
  ]);

  const todayResults = results.filter((m) => isToday(m.kickoff));
  const todayMatchesCount = todayFixtures.length + live.length + todayResults.length;
  const todayGoals = sumGoals(live) + sumGoals(todayResults);
  const newsToday = news.filter((n) => isToday(n.publishedAt)).length;

  return {
    todayMatches: todayMatchesCount,
    todayGoals,
    competitions: competitions.length,
    liveNow: live.length,
    newsToday,
  };
}

export interface LeagueStats {
  goals: number;
  matchesPlayed: number;
}

/**
 * مقتصرة عمداً على ما تُعيده استدعاءات القوائم (getLiveMatches/
 * getRecentResults) فعلياً: النتيجة النهائية فقط، لا events تفصيلية — هذه
 * لا تصل إلا عبر getMatchById لكل مباراة على حدة، وجلبها هنا يعني طلباً
 * إضافياً لكل مباراة في القائمة (استهلاك غير ضروري لحصة API-Football).
 * النسخة السابقة كانت تحسب مساعدات/بطاقات/هداف أعلى من match.events هنا
 * رغم أنها فارغة دائماً في هذا المسار، فتعرض "0" مضلِّلة وكأنها إحصاء
 * حقيقي بدل الاعتراف الصادق بعدم توفر البيانات على هذا المستوى.
 */
export async function getLeagueStats(): Promise<LeagueStats> {
  const [live, results] = await Promise.all([
    safeList(footballProvider.getLiveMatches()),
    safeList(footballProvider.getRecentResults()),
  ]);
  const played = [...live, ...results];

  return {
    goals: sumGoals(played),
    matchesPlayed: played.length,
  };
}
