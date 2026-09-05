import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { CompetitionLogo } from "@/components/shared/CompetitionLogo";
import { FollowButton } from "@/components/shared/FollowButton";
import { MatchCard } from "@/components/shared/MatchCard";
import { NewsCard } from "@/components/home/NewsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getFeaturedCompetitions } from "@/lib/services/competitions.service";
import { getRecentResults, getUpcomingMatches } from "@/lib/services/matches.service";
import { getNewsPool } from "@/lib/services/news.service";
import { safeResolve } from "@/lib/errors";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";
import { localizeTeamName, localizeCompetitionName } from "@/lib/i18n/localized-names";
import type { Match } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getServerLocale());
  return { title: `${t.search.pageTitle} — EXTRA TIME` };
}

/**
 * بحث بسيط وحقيقي بالكامل — بلا فهرسة، بلا provider جديد: يُصفّي (substring
 * مطابقة حرفية، بلا حساسية لحالة الأحرف) فوق بيانات محمَّلة أصلاً من الخدمات
 * الحالية (بطولات/مباريات/أخبار)، ثم يُعيد أول عدد معقول من كل نوع. [] صريحة
 * لكل قسم لا يطابق — لا نتيجة عشوائية "الأقرب" لملء الفراغ.
 */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const locale = await getServerLocale();
  const t = getMessages(locale);

  const hasQuery = query.length > 0;
  const needle = query.toLowerCase();

  const [competitions, recentResult, upcomingResult, newsPool] = hasQuery
    ? await Promise.all([
        safeResolve(getFeaturedCompetitions(), [], "search-competitions"),
        safeResolve(getRecentResults(), { matches: [], unavailable: false }, "search-recent"),
        safeResolve(getUpcomingMatches("week"), { matches: [], unavailable: false }, "search-upcoming"),
        safeResolve(getNewsPool(locale), [], "search-news"),
      ])
    : [[], { matches: [], unavailable: false }, { matches: [], unavailable: false }, []];

  // نفس مشكلة أسماء الفرق أعلاه: اسم البطولة يصل مُترجَماً حسب لغة العرض
  // الحالية (competitions.service.ts) — نطابق ضد الاسمين معاً.
  const matchedCompetitions = competitions
    .filter((c) => {
      const variants = [c.name, localizeCompetitionName(c.name, c.id, "en"), localizeCompetitionName(c.name, c.id, "ar")];
      return variants.some((v) => v.toLowerCase().includes(needle));
    })
    .slice(0, 6);

  // أسماء الفرق تصل مُترجَمة مسبقاً حسب لغة العرض الحالية (matches.service.ts
  // localizeMatches) — بحث إنجليزي عن فريق مُترجَم للعربية (أو العكس) كان
  // يفشل بصمت. localizeTeamName يقبل الاسم بأي من اللغتين ويُعيد كليهما،
  // فمطابقة النص ضد الاسمين معاً (لا الاسم المعروض وحده) تلتقط الحالتين.
  const teamMatches = (name: string) => {
    const variants = [name, localizeTeamName(name, "en"), localizeTeamName(name, "ar")];
    return variants.some((v) => v.toLowerCase().includes(needle));
  };

  const allMatches = new Map<string, Match>();
  for (const m of [...recentResult.matches, ...upcomingResult.matches]) allMatches.set(m.id, m);
  const matchedMatches = [...allMatches.values()]
    .filter((m) => teamMatches(m.homeTeam.name) || teamMatches(m.awayTeam.name))
    .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
    .slice(0, 6);

  const matchedNews = newsPool
    .filter((n) => n.title.toLowerCase().includes(needle) || n.summary.toLowerCase().includes(needle))
    .slice(0, 6);

  const totalResults = matchedCompetitions.length + matchedMatches.length + matchedNews.length;

  return (
    <div className="container-page py-6 md:py-10 max-w-3xl">
      <h1 className="text-2xl font-extrabold mb-6">{t.search.pageTitle}</h1>

      <form action="/search" method="get" className="relative mb-8">
        <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-dim" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t.search.placeholder}
          autoFocus
          className="h-12 w-full rounded-[var(--radius-sm)] border border-border bg-surface ps-9 pe-24 text-sm text-ink placeholder:text-muted-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
        <button
          type="submit"
          className="absolute top-1/2 -translate-y-1/2 end-1.5 h-9 px-4 rounded-[var(--radius-sm)] bg-primary text-primary-ink text-sm font-bold hover:opacity-90 transition-opacity"
        >
          {t.search.submit}
        </button>
      </form>

      {!hasQuery ? (
        <EmptyState title={t.search.promptTitle} description={t.search.prompt} />
      ) : totalResults === 0 ? (
        <EmptyState title={t.search.noResults} description={t.search.noResultsDesc} />
      ) : (
        <div className="space-y-10">
          {matchedCompetitions.length > 0 && (
            <section>
              <h2 className="text-sm font-extrabold text-muted-dim mb-3">{t.nav.competitions}</h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {matchedCompetitions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3"
                  >
                    <Link href={`/competitions/${c.id}`} className="flex flex-1 min-w-0 items-center gap-3 hover:text-primary transition-colors">
                      <CompetitionLogo logoUrl={c.logoUrl} name={c.name} size={28} />
                      <span className="font-bold text-sm truncate">{c.name}</span>
                    </Link>
                    <FollowButton target={{ kind: "competition", id: c.id, name: c.name, logoUrl: c.logoUrl }} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {matchedMatches.length > 0 && (
            <section>
              <h2 className="text-sm font-extrabold text-muted-dim mb-3">{t.nav.matches}</h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {matchedMatches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          )}

          {matchedNews.length > 0 && (
            <section>
              <h2 className="text-sm font-extrabold text-muted-dim mb-3">{t.nav.news}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {matchedNews.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
