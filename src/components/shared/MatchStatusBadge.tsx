"use client";

import type { MatchStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const statusKey: Record<MatchStatus, "statusScheduled" | "statusLive" | "statusFinished" | "statusPostponed" | "statusCancelled"> = {
  SCHEDULED: "statusScheduled",
  LIVE: "statusLive",
  FINISHED: "statusFinished",
  POSTPONED: "statusPostponed",
  CANCELLED: "statusCancelled",
};

export function MatchStatusBadge({ status, minute }: { status: MatchStatus; minute?: number }) {
  const { t } = useLocale();

  if (status === "LIVE") {
    return (
      <Badge tone="live">
        <span className="w-1.5 h-1.5 rounded-full bg-live animate-live-dot" />
        {minute ? `${minute}'` : t.match.statusLive}
      </Badge>
    );
  }

  const tone = status === "FINISHED" ? "neutral" : status === "CANCELLED" ? "error" : status === "POSTPONED" ? "warning" : "neutral";

  return <Badge tone={tone}>{t.match[statusKey[status]]}</Badge>;
}
