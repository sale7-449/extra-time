"use client";

import type { MatchEvent } from "@/lib/types";
import { eventTimeValue, formatEventMinute } from "@/lib/match-events";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ScorerLine {
  playerName: string;
  goals: MatchEvent[];
}

/** يُجمِّع أهداف نفس اللاعب في سطر واحد (مثال: "رافينيا 12', 47'")، ويرتّب
 * اللاعبين حسب أول هدف سجّله زمنياً — لا حسب الأبجدية. */
function groupScorers(events: MatchEvent[], teamId: string): ScorerLine[] {
  const goals = events.filter((e) => e.type === "GOAL" && e.teamId === teamId);
  const byPlayer = new Map<string, ScorerLine>();

  for (const goal of goals) {
    const existing = byPlayer.get(goal.playerName);
    if (existing) existing.goals.push(goal);
    else byPlayer.set(goal.playerName, { playerName: goal.playerName, goals: [goal] });
  }

  return [...byPlayer.values()].sort((a, b) => {
    const aFirst = Math.min(...a.goals.map(eventTimeValue));
    const bFirst = Math.min(...b.goals.map(eventTimeValue));
    return aFirst - bFirst;
  });
}

/**
 * أسماء الهدافين تحت كل فريق في رأس صفحة المباراة — من بيانات الأحداث
 * الحقيقية فقط (GOAL بمعرّف الفريق نفسه)، لا اختلاق. لا شيء يُعرض إن كانت
 * الأحداث فارغة (المصدر لا يوفّرها لهذه المباراة) بدل قائمة وهمية.
 */
export function MatchScorers({ events, teamId }: { events: MatchEvent[]; teamId: string }) {
  const { t } = useLocale();
  const scorers = groupScorers(events, teamId);

  if (scorers.length === 0) return null;

  return (
    <ul className="mt-1 space-y-0.5 text-center">
      {scorers.map((scorer) => (
        <li key={scorer.playerName} className="text-xs text-muted-dim leading-snug">
          <span className="font-bold text-muted">{scorer.playerName}</span>{" "}
          <span className="tabular" dir="ltr">
            {scorer.goals.map((g, i) => (
              <span key={g.id}>
                {i > 0 && ", "}
                {formatEventMinute(g)}
                {g.isOwnGoal && <span className="text-warning font-bold"> ({t.match.ownGoalShort})</span>}
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
