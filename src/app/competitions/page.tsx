import { CompetitionCard } from "@/components/shared/CompetitionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCompetitionsWithSummary } from "@/lib/services/competitions.service";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.competitions.title} — EXTRA TIME` };
}

export default async function CompetitionsPage() {
  const t = getMessages(await getServerLocale());
  const { summaries, unavailable } = await getCompetitionsWithSummary();

  return (
    <div className="container-page py-8 md:py-10">
      <h1 className="text-2xl font-extrabold mb-6">{t.competitions.title}</h1>
      {summaries.length === 0 ? (
        unavailable ? (
          <EmptyState title={t.common.dataUnavailable} description={t.common.dataUnavailableDesc} />
        ) : (
          <EmptyState title={t.competitions.noCompetitions} />
        )
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <CompetitionCard key={summary.competition.id} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
