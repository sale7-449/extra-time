"use client";

import type { Match } from "@/lib/types";
import type { MatchedMedia } from "@/lib/providers/media/match-media-matcher";
import { findGoalVideo } from "@/lib/providers/media/goal-video-matcher";
import { MatchStats } from "@/components/match/MatchStats";
import { MatchSummary } from "@/components/match/MatchSummary";
import { GoalVideoButton } from "@/components/media/GoalVideoButton";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatMatchDate } from "@/lib/utils";

export function MatchOverview({ match, matchMedia }: { match: Match; matchMedia: MatchedMedia[] }) {
  const { t, locale } = useLocale();
  const goals = match.events.filter((e) => e.type === "GOAL").sort((a, b) => a.minute - b.minute);
  const topStats = match.stats.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {match.round && <InfoItem label={t.match.round} value={match.round} />}
        {match.venue && <InfoItem label={t.match.venue} value={match.venue} />}
        {match.city && <InfoItem label={t.match.city} value={match.city} />}
        {match.referee && <InfoItem label={t.match.referee} value={match.referee} />}
        <InfoItem
          label={t.match.date}
          value={formatMatchDate(match.kickoff, locale)}
        />
      </div>

      {goals.length > 0 && (
        <div>
          <h4 className="text-sm font-extrabold mb-3">{t.match.goals}</h4>
          <ul className="space-y-2.5">
            {goals.map((g) => {
              const video = findGoalVideo(g, matchMedia);
              return (
                <li key={g.id} className="flex items-start gap-2 text-sm rounded-[var(--radius-sm)] bg-surface-2 border border-border px-3 py-2.5">
                  <span className="mt-0.5">⚽</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="font-bold">{g.playerName}</span>
                      {g.isOwnGoal && <span className="text-warning text-xs font-bold">({t.match.ownGoalShort})</span>}
                      {g.detail && !g.isOwnGoal && <span className="text-muted-dim text-xs">({g.detail})</span>}
                      <span className="text-muted-dim text-xs">
                        {g.teamId === match.homeTeam.id ? match.homeTeam.shortName : match.awayTeam.shortName}
                      </span>
                    </div>
                    {g.assistName && (
                      <p className="text-xs text-muted mt-0.5">
                        {t.match.assist}: {g.assistName}
                      </p>
                    )}
                    {video && <GoalVideoButton item={video} />}
                  </div>
                  <span className="text-muted-dim tabular text-xs shrink-0">{g.minute}&apos;</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <MatchSummary match={match} />

      {topStats.length > 0 && (
        <div>
          <h4 className="text-sm font-extrabold mb-3">{t.match.topStats}</h4>
          <MatchStats match={{ ...match, stats: topStats }} />
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-surface-2 border border-border px-3 py-2.5">
      <p className="text-[11px] text-muted-dim mb-0.5">{label}</p>
      <p className="text-sm font-bold truncate">{value}</p>
    </div>
  );
}
