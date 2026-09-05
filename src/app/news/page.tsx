import { NewsCard } from "@/components/home/NewsCard";
import { NewsSection } from "@/components/news/NewsSection";
import { NewsExplorer } from "@/components/news/NewsExplorer";
import { EmptyState } from "@/components/ui/EmptyState";
import { getNewsPool, selectLatestNews } from "@/lib/services/news.service";
import { safeResolve } from "@/lib/errors";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";
import type { NewsArticle } from "@/lib/types";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.nav.news} — EXTRA TIME` };
}

const EUROPEAN_CATEGORIES: NewsArticle["category"][] = ["PREMIER_LEAGUE", "LA_LIGA", "BUNDESLIGA", "SERIE_A", "LIGUE_1"];

export default async function NewsPage() {
  const locale = await getServerLocale();
  const t = getMessages(locale);
  const pool = await safeResolve(getNewsPool(locale), [], "news-page");

  if (pool.length === 0) {
    return (
      <div className="container-page py-8 md:py-10">
        <h1 className="text-2xl font-extrabold mb-6">{t.nav.news}</h1>
        <EmptyState title={t.news.newsUnavailable} description={t.news.newsUnavailableDesc} />
      </div>
    );
  }

  const [featured, ...rest] = pool;
  const saudi = rest.filter((a) => a.category === "SAUDI_LEAGUE").slice(0, 6);
  const champions = rest.filter((a) => a.category === "CHAMPIONS_LEAGUE").slice(0, 6);
  const transfers = rest.filter((a) => a.category === "TRANSFERS").slice(0, 6);
  const european = rest.filter((a) => EUROPEAN_CATEGORIES.includes(a.category)).slice(0, 6);

  // خبر ظهر في قسم مصنَّف أعلاه (السعودية/الانتقالات/أبطال أوروبا/الأوروبي)
  // لا يتكرَّر في "أحدث الأخبار" الافتراضية أسفل الصفحة.
  const usedIds = new Set<string>([featured, ...saudi, ...champions, ...transfers, ...european].map((a) => a.id));
  const latest = selectLatestNews(rest, usedIds, { maxAgeDays: 7, limit: 12 });

  return (
    <div className="container-page py-8 md:py-10 space-y-12">
      <div>
        <h1 className="text-2xl font-extrabold mb-6">{t.nav.news}</h1>
        <NewsCard article={featured} size="lg" />
      </div>

      <NewsSection title={t.news.sectionSaudi} articles={saudi} />
      <NewsSection title={t.news.sectionTransfers} href="/transfers" articles={transfers} />
      <NewsSection title={t.news.sectionChampionsLeague} articles={champions} />
      <NewsSection title={t.news.sectionEuropean} articles={european} />

      <div>
        <h2 className="text-lg md:text-xl font-extrabold mb-4">{t.news.sectionLatest}</h2>
        <NewsExplorer articles={rest} defaultArticles={latest} />
      </div>
    </div>
  );
}
