"use client";

import type { StandingsEntry } from "@/lib/types";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { cx } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function StandingsTable({ entries }: { entries: StandingsEntry[] }) {
  const { t } = useLocale();

  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-dim text-xs">
            <th className="py-3 ps-4 text-start font-bold">#</th>
            <th className="py-3 text-start font-bold">{t.competitions.team}</th>
            <th className="py-3 text-center font-bold tabular">{t.competitions.played}</th>
            <th className="py-3 text-center font-bold tabular">{t.competitions.won}</th>
            <th className="py-3 text-center font-bold tabular hidden sm:table-cell">{t.competitions.drawn}</th>
            <th className="py-3 text-center font-bold tabular hidden sm:table-cell">{t.competitions.lost}</th>
            <th className="py-3 text-center font-bold tabular">{t.competitions.diff}</th>
            <th className="py-3 pe-4 text-center font-bold tabular">{t.competitions.points}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.team.id} className="border-b border-border last:border-0">
              <td className="py-3 ps-4">
                <span
                  className={cx(
                    "inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-xs font-extrabold tabular",
                    entry.zone === "CONTINENTAL" && "bg-primary/15 text-primary",
                    entry.zone === "RELEGATION" && "bg-error/15 text-error",
                    !entry.zone && "text-muted"
                  )}
                >
                  {entry.position}
                </span>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <TeamLogo team={entry.team} size="sm" />
                  <span className="font-bold truncate">{entry.team.name}</span>
                </div>
              </td>
              <td className="py-3 text-center tabular">{entry.played}</td>
              <td className="py-3 text-center tabular">{entry.won}</td>
              <td className="py-3 text-center tabular hidden sm:table-cell">{entry.drawn}</td>
              <td className="py-3 text-center tabular hidden sm:table-cell">{entry.lost}</td>
              <td className="py-3 text-center tabular" dir="ltr">
                {entry.goalsFor - entry.goalsAgainst > 0 ? "+" : ""}
                {entry.goalsFor - entry.goalsAgainst}
              </td>
              <td className="py-3 pe-4 text-center font-extrabold tabular">{entry.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
