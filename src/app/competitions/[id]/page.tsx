import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompetitionForDetailPage, getStandings } from "@/lib/services/competitions.service";
import { getUpcomingMatches } from "@/lib/services/matches.service";
import { canonicalCompetitionId } from "@/lib/providers/football/ids";
import { MatchCard } from "@/components/shared/MatchCard";
import { StandingsTable } from "@/components/shared/StandingsTable";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { FollowButton } from "@/components/shared/FollowButton";
import { CompetitionLogo } from "@/components/shared/CompetitionLogo";
import { TrophyIcon } from "@/components/icons";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [data, t] = await Promise.all([getCompetitionForDetailPage(id), getServerLocale().then(getMessages)]);
  if (!data) return { title: `${t.competitions.notFound} — EXTRA TIME` };
  const { competition } = data;

  return {
    title: `${competition.name} — EXTRA TIME`,
    description: `${t.competitions.metaDescPrefix} ${competition.name} ${t.competitions.metaDescSuffix}`,
    openGraph: { title: competition.name, description: `${t.competitions.ogDescPrefix} ${competition.name}` },
  };
}

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getMessages(await getServerLocale());
  const [data, weekResult, standings] = await Promise.all([
    getCompetitionForDetailPage(id),
    getUpcomingMatches("week"),
    getStandings(id),
  ]);

  if (!data) notFound();
  const { competition, unavailable } = data;

  const canonicalId = canonicalCompetitionId(competition.id);
  const matches = weekResult.matches.filter((m) =>
    canonicalId ? canonicalCompetitionId(m.competitionId) === canonicalId : m.competitionId === competition.id
  );

  return (
    <div>
      <div
        className="py-14 border-b border-border"
        style={{ background: `linear-gradient(160deg, ${competition.colorFrom} 0%, #111111 90%)` }}
      >
        <div className="container-page flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <CompetitionLogo competitionId={competition.id} logoUrl={competition.logoUrl} name={competition.name} size={56} />
            <div>
              <span className="text-sm font-bold text-white/70">{competition.country}</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">{competition.name}</h1>
            </div>
          </div>
          <FollowButton target={{ kind: "competition", id: competition.id, name: competition.name, logoUrl: competition.logoUrl }} />
        </div>
      </div>

      <div className="container-page py-8 space-y-10">
        {unavailable ? (
          <EmptyState title={t.competitions.dataUnavailable} description={t.competitions.dataUnavailableDesc} />
        ) : (
          <>
            <section>
              <SectionHeader title={t.competitions.upcoming} icon={<TrophyIcon />} />
              {matches.length > 0 ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {matches.map((m) => (
                    <MatchCard key={m.id} match={m} showCompetition={false} />
                  ))}
                </div>
              ) : (
                <EmptyState title={t.competitions.noUpcoming} />
              )}
            </section>

            <section>
              <SectionHeader title={t.competitions.standings} />
              {standings.length > 0 ? (
                <StandingsTable entries={standings} />
              ) : (
                <EmptyState title={t.competitions.noStandings} description={t.competitions.noStandingsDesc} />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
