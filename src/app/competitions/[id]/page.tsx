import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompetition, getStandings } from "@/lib/services/competitions.service";
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
  const [competition, t] = await Promise.all([getCompetition(id), getServerLocale().then(getMessages)]);
  if (!competition) return { title: `${t.competitions.notFound} — EXTRA TIME` };

  return {
    title: `${competition.name} — EXTRA TIME`,
    description: `${t.competitions.metaDescPrefix} ${competition.name} ${t.competitions.metaDescSuffix}`,
    openGraph: { title: competition.name, description: `${t.competitions.ogDescPrefix} ${competition.name}` },
  };
}

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getMessages(await getServerLocale());
  const [competition, weekResult, standings] = await Promise.all([
    getCompetition(id),
    getUpcomingMatches("week"),
    getStandings(id),
  ]);

  if (!competition) notFound();

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
            {/* خلفية بيضاء صلبة — نفس منطق CompetitionCard، شعارات كثيرة (مثل
                البريميرليج ودوري الأبطال) حبر داكن يختفي على خلفية شبه شفافة
                فوق تدرّج داكن. */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-sm overflow-hidden [&_svg]:w-6 [&_svg]:h-6">
              <CompetitionLogo logoUrl={competition.logoUrl} name={competition.name} size={40} />
            </div>
            <div>
              <span className="text-sm font-bold text-white/70">{competition.country}</span>
              <h1 className="text-3xl font-extrabold text-white mt-1">{competition.name}</h1>
            </div>
          </div>
          <FollowButton target={{ kind: "competition", id: competition.id, name: competition.name, logoUrl: competition.logoUrl }} />
        </div>
      </div>

      <div className="container-page py-8 space-y-10">
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
      </div>
    </div>
  );
}
