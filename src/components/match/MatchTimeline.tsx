"use client";

import type { Match, MatchEvent, MatchEventType } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { cx } from "@/lib/utils";
import { eventTimeValue, formatEventMinute } from "@/lib/match-events";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const eventIcon: Record<MatchEvent["type"], string> = {
  GOAL: "⚽",
  YELLOW_CARD: "🟨",
  RED_CARD: "🟥",
  SUBSTITUTION: "🔄",
};

const eventLabelKey: Record<MatchEvent["type"], "goal" | "yellowCard" | "redCard" | "substitution"> = {
  GOAL: "goal",
  YELLOW_CARD: "yellowCard",
  RED_CARD: "redCard",
  SUBSTITUTION: "substitution",
};

// لون التمييز البصري لكل نوع حدث — من ألوان النظام الحالية فقط (لا ألوان
// جديدة): هدف=success، تبديل=primary، أصفر=warning، أحمر=error.
const eventDotClass: Record<MatchEventType, string> = {
  GOAL: "bg-success",
  SUBSTITUTION: "bg-primary",
  YELLOW_CARD: "bg-warning",
  RED_CARD: "bg-error",
};

// الترتيب زمني (minute + extraMinute) دائماً أولاً. نوع الحدث لا يُحدّد
// الترتيب — يُستخدم فقط كمُرجِّح ثابت عند تطابق الدقيقة تماماً بين حدثين.
const TYPE_TIE_BREAK_ORDER: Record<MatchEventType, number> = {
  GOAL: 0,
  SUBSTITUTION: 1,
  YELLOW_CARD: 2,
  RED_CARD: 3,
};

export function MatchTimeline({ match }: { match: Match }) {
  const { t } = useLocale();

  if (match.events.length === 0) {
    // "ستظهر عند البداية" مضلِّلة لمباراة انتهت/جارية فعلاً وبلا بيانات
    // أحداث من المصدر — رسالة مختلفة وصادقة لهذه الحالة تحديداً.
    if (match.status === "SCHEDULED") {
      return <EmptyState title={t.match.noEvents} description={t.match.noEventsDesc} />;
    }
    return <EmptyState title={t.match.noEventsUnavailable} description={t.match.noEventsUnavailableDesc} />;
  }

  const sorted = [...match.events].sort((a, b) => {
    const diff = eventTimeValue(a) - eventTimeValue(b);
    if (diff !== 0) return diff;
    return TYPE_TIE_BREAK_ORDER[a.type] - TYPE_TIE_BREAK_ORDER[b.type];
  });

  return (
    <ol className="relative border-e border-border pe-6 space-y-6">
      {sorted.map((event) => {
        const isHome = event.teamId === match.homeTeam.id;
        return (
          <li key={event.id} className="relative">
            <span
              className={cx(
                "absolute -end-[29px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg",
                eventDotClass[event.type]
              )}
            />
            <div className="flex items-center gap-2 text-xs font-bold text-muted mb-1">
              <span className="tabular">{formatEventMinute(event)}</span>
              <span>{eventIcon[event.type]}</span>
              <span>{t.match[eventLabelKey[event.type]]}</span>
              <span className="text-muted-dim">· {isHome ? match.homeTeam.name : match.awayTeam.name}</span>
            </div>
            <p className="text-sm font-bold">
              {event.playerName}
              {event.isOwnGoal && <span className="text-warning font-extrabold"> ({t.match.ownGoalShort})</span>}
              {event.assistName && <span className="text-muted font-normal"> — {t.match.assist}: {event.assistName}</span>}
              {event.detail && !event.isOwnGoal && <span className="text-muted font-normal"> — {event.detail}</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
