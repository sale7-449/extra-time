import { MatchCard } from "@/components/shared/MatchCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getRecentResults } from "@/lib/services/matches.service";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.nav.results} — EXTRA TIME` };
}

export default async function ResultsPage() {
  const t = getMessages(await getServerLocale());
  const { matches: finished, unavailable } = await getRecentResults();

  return (
    <div className="container-page py-8 md:py-10">
      <h1 className="text-2xl font-extrabold mb-6">{t.nav.results}</h1>
      {finished.length === 0 ? (
        unavailable ? (
          <EmptyState title={t.common.dataUnavailable} description={t.common.dataUnavailableDesc} />
        ) : (
          <EmptyState title={t.common.noResults} description={t.common.noResultsDesc} />
        )
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {finished.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
