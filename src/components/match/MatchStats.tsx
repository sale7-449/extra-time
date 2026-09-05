"use client";

import type { Match, MatchStatKey } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const statLabelKey: Record<MatchStatKey, "statPossession" | "statShots" | "statShotsOnTarget" | "statCorners" | "statFouls" | "statOffsides" | "statPasses" | "statPassAccuracy" | "statYellowCards" | "statRedCards"> = {
  possession: "statPossession",
  shots: "statShots",
  shotsOnTarget: "statShotsOnTarget",
  corners: "statCorners",
  fouls: "statFouls",
  offsides: "statOffsides",
  passes: "statPasses",
  passAccuracy: "statPassAccuracy",
  yellowCards: "statYellowCards",
  redCards: "statRedCards",
};

export function MatchStats({ match }: { match: Match }) {
  const { t } = useLocale();

  if (match.stats.length === 0) {
    if (match.status === "SCHEDULED") {
      return <EmptyState title={t.match.noStats} description={t.match.noStatsDesc} />;
    }
    return <EmptyState title={t.match.noStatsUnavailable} description={t.match.noStatsUnavailableDesc} />;
  }

  return (
    <div className="space-y-5">
      {match.stats.map((stat) => {
        const total = stat.home + stat.away || 1;
        const homePct = (stat.home / total) * 100;
        return (
          <div key={stat.key}>
            <div className="flex items-center justify-between text-sm font-extrabold mb-1.5 tabular">
              <span>{stat.home}{stat.isPercentage ? "%" : ""}</span>
              <span className="text-muted font-bold text-xs">{t.match[statLabelKey[stat.key]]}</span>
              <span>{stat.away}{stat.isPercentage ? "%" : ""}</span>
            </div>
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="bg-primary" style={{ width: `${homePct}%` }} />
              <div className="bg-muted-dim" style={{ width: `${100 - homePct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
