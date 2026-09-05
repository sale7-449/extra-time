import type { ReactNode } from "react";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { LiveMatchCard } from "@/components/home/LiveMatchCard";
import { MatchCard } from "@/components/shared/MatchCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLiveMatches, getUpcomingMatches } from "@/lib/services/matches.service";
import type { Match } from "@/lib/types";
import { FireIcon, MatchesIcon } from "@/components/icons";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.nav.matches} — EXTRA TIME` };
}

export default async function MatchesPage() {
  const t = getMessages(await getServerLocale());
  const [liveResult, todayResult, tomorrowResult, weekResult] = await Promise.all([
    getLiveMatches(),
    getUpcomingMatches("today"),
    getUpcomingMatches("tomorrow"),
    getUpcomingMatches("week"),
  ]);

  return (
    <div className="container-page py-8 md:py-10 space-y-12">
      <h1 className="text-2xl font-extrabold">{t.nav.matches}</h1>

      {liveResult.matches.length > 0 && (
        <section>
          <SectionHeader title={t.home.liveNow} icon={<FireIcon />} />
          <div className="grid gap-4 sm:grid-cols-2">
            {liveResult.matches.map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      <MatchGroup
        title={t.common.today}
        matches={todayResult.matches}
        unavailable={todayResult.unavailable}
        noneText={t.common.noMatchesPeriod}
        unavailableTitle={t.common.dataUnavailable}
        unavailableDesc={t.common.dataUnavailableDesc}
      />
      <MatchGroup
        title={t.common.tomorrow}
        matches={tomorrowResult.matches}
        unavailable={tomorrowResult.unavailable}
        noneText={t.common.noMatchesPeriod}
        unavailableTitle={t.common.dataUnavailable}
        unavailableDesc={t.common.dataUnavailableDesc}
      />
      <MatchGroup
        title={t.common.thisWeek}
        matches={weekResult.matches}
        unavailable={weekResult.unavailable}
        icon={<MatchesIcon />}
        noneText={t.common.noMatchesPeriod}
        unavailableTitle={t.common.dataUnavailable}
        unavailableDesc={t.common.dataUnavailableDesc}
      />
    </div>
  );
}

function MatchGroup({
  title,
  matches,
  unavailable,
  icon,
  noneText,
  unavailableTitle,
  unavailableDesc,
}: {
  title: string;
  matches: Match[];
  unavailable: boolean;
  icon?: ReactNode;
  noneText: string;
  unavailableTitle: string;
  unavailableDesc: string;
}) {
  return (
    <section>
      <SectionHeader title={title} icon={icon} />
      {matches.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      ) : unavailable ? (
        <EmptyState title={unavailableTitle} description={unavailableDesc} />
      ) : (
        <EmptyState title={noneText} />
      )}
    </section>
  );
}
