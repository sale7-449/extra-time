"use client";

import Link from "next/link";
import type { Match } from "@/lib/types";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { ScoreDisplay } from "@/components/shared/ScoreDisplay";
import { formatKickoffTime } from "@/lib/utils";
import { localizeCompetitionShortName } from "@/lib/i18n/localized-names";
import { cx } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * البطاقة المرجعية لعرض مباراة في أي سياق (الرئيسية، المباريات، النتائج،
 * صفحة البطولة، البحث لاحقاً) — تتكيف تلقائياً مع الحالة (لم تبدأ/مباشر/انتهت)
 * دون الحاجة لنسخة منفصلة لكل صفحة.
 */
export function MatchCard({ match, showCompetition = true }: { match: Match; showCompetition?: boolean }) {
  const { t, locale } = useLocale();
  const competitionShortName = localizeCompetitionShortName(match.competitionId, locale);
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const hasScore = isLive || isFinished;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3.5 transition-colors hover:border-primary/30 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
    >
      <div className="flex flex-col items-center w-14 shrink-0 gap-1">
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-live">
            <span className="w-1.5 h-1.5 rounded-full bg-live animate-live-dot" />
            {match.minute}&apos;
          </span>
        ) : (
          <span className="text-sm font-extrabold tabular" dir="ltr">
            {formatKickoffTime(match.kickoff, locale)}
          </span>
        )}
        {showCompetition && competitionShortName && (
          <span className="text-[10px] text-muted-dim truncate max-w-14 text-center">{competitionShortName}</span>
        )}
      </div>

      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className={cx("text-sm truncate", isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? "font-extrabold" : "font-bold")}>
            {match.homeTeam.name}
          </span>
          <TeamLogo team={match.homeTeam} size="sm" />
        </div>

        {hasScore ? (
          <ScoreDisplay home={match.homeScore} away={match.awayScore} live={isLive} size="sm" />
        ) : (
          <span className="text-xs text-muted-dim px-1 shrink-0">{t.common.vs}</span>
        )}

        <div className="flex flex-1 items-center gap-2 min-w-0 justify-end">
          <TeamLogo team={match.awayTeam} size="sm" />
          <span className={cx("text-sm truncate", isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? "font-extrabold" : "font-bold")}>
            {match.awayTeam.name}
          </span>
        </div>
      </div>
    </Link>
  );
}
