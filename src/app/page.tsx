import { Hero } from "@/components/home/Hero";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { LiveMatchesSection } from "@/components/home/LiveMatchesSection";
import { MatchCard } from "@/components/shared/MatchCard";
import { CompetitionCard } from "@/components/shared/CompetitionCard";
import { NewsCard } from "@/components/home/NewsCard";
import { NewsSection } from "@/components/news/NewsSection";
import { MediaSection } from "@/components/media/MediaSection";
import { TodayMatchHighlights } from "@/components/home/TodayMatchHighlights";
import { StatCard } from "@/components/home/StatCard";
import { SnapchatShareCard } from "@/components/home/SnapchatShareCard";
import { FollowingSection } from "@/components/home/FollowingSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLiveMatches, getUpcomingMatches } from "@/lib/services/matches.service";
import { getCompetitionsWithSummary } from "@/lib/services/competitions.service";
import { getNewsPool, selectLatestNews } from "@/lib/services/news.service";
import { getLatestMedia, getMatchMedia } from "@/lib/services/media.service";
import { getHomeStats } from "@/lib/services/stats.service";
import { safeResolve } from "@/lib/errors";
import { FireIcon, MatchesIcon, NewsIcon, TrophyIcon, PlayIcon } from "@/components/icons";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";
import type { NewsArticle, Match, MediaItem } from "@/lib/types";

const EMPTY_STATS = { todayMatches: 0, todayGoals: 0, competitions: 0, liveNow: 0, newsToday: 0 };
const EMPTY_MATCHES = { matches: [], unavailable: false };
const EMPTY_COMPETITIONS = { summaries: [], unavailable: false };
const EUROPEAN_CATEGORIES: NewsArticle["category"][] = ["PREMIER_LEAGUE", "LA_LIGA", "BUNDESLIGA", "SERIE_A", "LIGUE_1", "CHAMPIONS_LEAGUE"];

export default async function HomePage() {
  const locale = await getServerLocale();
  const t = getMessages(locale);

  // كل قسم يُحضَّر بشكل مستقل — فشل قسم واحد (مثلاً الأخبار) لا يمنع بقية
  // الصفحة من الظهور، بدل Promise.all الذي يسقط الصفحة كاملة عند أي خطأ.
  const [liveResult, todayResult, competitionsResult, newsPool, media, stats] = await Promise.all([
    safeResolve(getLiveMatches(), EMPTY_MATCHES, "live-matches"),
    safeResolve(getUpcomingMatches("today"), EMPTY_MATCHES, "today-matches"),
    safeResolve(getCompetitionsWithSummary(), EMPTY_COMPETITIONS, "competitions"),
    safeResolve(getNewsPool(locale), [], "news-pool"),
    safeResolve(getLatestMedia(6, locale), [], "media-latest"),
    safeResolve(getHomeStats(), EMPTY_STATS, "home-stats"),
  ]);

  const liveMatches = liveResult.matches;
  const todayMatches = todayResult.matches;
  const competitionSummaries = competitionsResult.summaries;

  // فيديو موثوق واحد لكل مباراة منتهية اليوم كحدّ أقصى — لا طلب شبكة إضافي
  // (نفس مجموعة الفيديوهات المُحمَّلة أصلاً لأعلاه، ونفس مباريات اليوم
  // المُحمَّلة أصلاً)، والمطابقة نفسها حساب محلي عبر match-media-matcher.
  // [] صريحة إن لم توجد أي مباراة منتهية اليوم بفيديو موثوق — لا قسم فارغ.
  const finishedToday = todayMatches.filter((m) => m.status === "FINISHED").slice(0, 4);
  const todayHighlightEntries = await safeResolve(
    (async () => {
      const results = await Promise.all(
        finishedToday.map(async (match) => ({ match, matched: await getMatchMedia(match, locale) }))
      );
      const seenMediaIds = new Set<string>();
      const entries: Array<{ match: Match; item: MediaItem }> = [];
      for (const { match, matched } of results) {
        const top = matched.find(({ item }) => !seenMediaIds.has(item.id));
        if (top) {
          seenMediaIds.add(top.item.id);
          entries.push({ match, item: top.item });
        }
      }
      return entries.slice(0, 3);
    })(),
    [],
    "today-match-highlights"
  );
  const [topStory, ...restNews] = newsPool;
  // كل قسم مصنَّف يُبنى أولاً من المجمّع الكامل، ثم "otherNews" (بجانب أهم
  // خبر) يستبعد ما استُخدم فعلاً في الأقسام أدناه ويلتزم بحدّ عمر 7 أيام —
  // بلا هذا كان نفس الخبر يظهر في أكثر من قسم على نفس الصفحة.
  const saudiNews = restNews.filter((n) => n.category === "SAUDI_LEAGUE").slice(0, 3);
  const transferNews = restNews.filter((n) => n.category === "TRANSFERS").slice(0, 3);
  const europeanNews = restNews.filter((n) => EUROPEAN_CATEGORIES.includes(n.category)).slice(0, 3);
  const usedIds = new Set<string>([...saudiNews, ...transferNews, ...europeanNews].map((a) => a.id));
  if (topStory) usedIds.add(topStory.id);
  const otherNews = selectLatestNews(restNews, usedIds, { maxAgeDays: 7, limit: 4 });

  return (
    <>
      <Hero />

      <div className="container-page py-10 space-y-16">
        <FollowingSection />

        {liveMatches.length > 0 && (
          <section>
            <SectionHeader
              title={t.home.liveNow}
              subtitle={t.home.liveNowSub}
              icon={<FireIcon />}
              href="/matches"
            />
            <LiveMatchesSection initialMatches={liveMatches} />
          </section>
        )}

        <section>
          <SectionHeader title={t.home.todayMatches} icon={<MatchesIcon />} href="/matches" />
          {todayMatches.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {todayMatches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          ) : todayResult.unavailable ? (
            <EmptyState title={t.common.dataUnavailable} description={t.common.dataUnavailableDesc} />
          ) : (
            <EmptyState title={t.home.noTodayMatches} description={t.home.noTodayMatchesDesc} />
          )}
        </section>

        <TodayMatchHighlights title={t.videos.todayHighlightsSection} entries={todayHighlightEntries} />

        <section>
          <SectionHeader title={t.home.topCompetitions} icon={<TrophyIcon />} href="/competitions" />
          {competitionSummaries.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
              {competitionSummaries.map((summary) => (
                <div key={summary.competition.id} className="w-72 shrink-0 snap-start">
                  <CompetitionCard summary={summary} />
                </div>
              ))}
            </div>
          ) : competitionsResult.unavailable ? (
            <EmptyState title={t.common.dataUnavailable} description={t.common.dataUnavailableDesc} />
          ) : (
            <EmptyState title={t.competitions.noCompetitions} />
          )}
        </section>

        {topStory && (
          <section>
            <SectionHeader title={t.home.latestNews} href="/news" />
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <NewsCard article={topStory} size="lg" />
              <div className="space-y-4">
                {otherNews.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          </section>
        )}

        <NewsSection title={t.news.sectionSaudi} href="/news" articles={saudiNews} />
        <NewsSection title={t.news.sectionTransfers} href="/transfers" articles={transferNews} />
        <NewsSection title={t.news.sectionEuropean} href="/news" articles={europeanNews} />

        <MediaSection title={t.videos.sectionLatest} href="/videos" icon={<PlayIcon />} items={media} />

        <section>
          <SectionHeader title={t.home.numbersTalk} />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label={t.home.statTodayMatches} value={stats.todayMatches} icon={<MatchesIcon />} />
            <StatCard label={t.home.statTodayGoals} value={stats.todayGoals} icon={<FireIcon />} />
            <StatCard label={t.home.statCompetitions} value={stats.competitions} icon={<TrophyIcon />} />
            <StatCard label={t.home.statNewsToday} value={stats.newsToday} icon={<NewsIcon />} />
            <StatCard label={t.home.statLiveNow} value={stats.liveNow} />
          </div>
        </section>

        <SnapchatShareCard />
      </div>
    </>
  );
}
