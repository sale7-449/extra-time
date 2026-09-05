"use client";

import Link from "next/link";
import type { Match } from "@/lib/types";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { ScoreDisplay } from "@/components/shared/ScoreDisplay";
import { MatchStatusBadge } from "@/components/shared/MatchStatusBadge";
import { localizeCompetitionName } from "@/lib/i18n/localized-names";
import { PlayIcon } from "@/components/icons";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function LiveMatchCard({ match }: { match: Match }) {
  const { t, locale } = useLocale();
  const competitionName = localizeCompetitionName("", match.competitionId, locale);

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group relative block overflow-hidden rounded-[var(--radius-lg)] border border-live/25 bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-live/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
    >
      <div
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--live)" }}
        aria-hidden
      />

      <div className="relative flex items-center justify-between mb-5">
        <MatchStatusBadge status={match.status} minute={match.minute} />
        {competitionName && <span className="text-xs font-bold text-muted">{competitionName}</span>}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamLogo team={match.homeTeam} size="lg" />
          <span className="text-sm font-bold text-center">{match.homeTeam.name}</span>
        </div>

        <ScoreDisplay home={match.homeScore} away={match.awayScore} live size="md" />

        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamLogo team={match.awayTeam} size="lg" />
          <span className="text-sm font-bold text-center">{match.awayTeam.name}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-primary/10 border border-primary/25 py-2.5 text-sm font-bold text-primary group-hover:bg-primary/15 transition-colors">
        <PlayIcon className="w-4 h-4" />
        {t.common.watchMatch}
      </div>
    </Link>
  );
}
