"use client";

import Link from "next/link";
import type { CompetitionSummary } from "@/lib/services/competitions.service";
import { formatKickoffTime } from "@/lib/utils";
import { CompetitionLogo } from "@/components/shared/CompetitionLogo";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * بطاقة البطولة المرجعية — تُستخدم في الرئيسية (تمرير أفقي) وصفحة البطولات
 * (شبكة). تعرض هوية البطولة + بيانات فعلية (عدد المباريات، المباراة القادمة)
 * بدل الاكتفاء بشعار ولون.
 */
export function CompetitionCard({ summary }: { summary: CompetitionSummary }) {
  const { t, locale } = useLocale();
  const { competition, matchCount, nextMatch, unavailable } = summary;

  return (
    <Link
      href={`/competitions/${competition.id}`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
    >
      <div
        className="relative flex items-center gap-3 p-4"
        style={{ background: `linear-gradient(155deg, ${competition.colorFrom} 0%, ${competition.colorTo} 100%)` }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative">
          <CompetitionLogo competitionId={competition.id} logoUrl={competition.logoUrl} name={competition.name} size={44} />
        </div>
        <div className="relative min-w-0">
          <p className="text-[11px] font-bold text-white/70">{competition.country}</p>
          <p className="text-base font-extrabold text-white leading-tight truncate">{competition.name}</p>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3">
        {unavailable ? (
          <div className="rounded-[var(--radius-sm)] bg-surface-2 border border-border p-3 text-xs">
            <p className="text-muted-dim">{t.competitions.dataUnavailable}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted">
              <span className="font-extrabold text-ink tabular">{matchCount}</span> {t.competitions.matchCount}
            </p>

            <div className="rounded-[var(--radius-sm)] bg-surface-2 border border-border p-3 text-xs">
              {nextMatch ? (
                <>
                  <p className="text-muted-dim mb-1">{t.competitions.nextMatch}</p>
                  <p className="font-bold truncate">
                    {nextMatch.homeTeam.name} <span className="text-muted-dim">{t.common.vs}</span> {nextMatch.awayTeam.name}
                  </p>
                  <p className="text-muted-dim mt-1 tabular" dir="ltr">
                    {formatKickoffTime(nextMatch.kickoff, locale)}
                  </p>
                </>
              ) : (
                <p className="text-muted-dim">{t.competitions.noNextMatch}</p>
              )}
            </div>
          </>
        )}

        <span className="mt-auto text-sm font-bold text-primary group-hover:underline underline-offset-4">
          {t.competitions.viewCompetition}
        </span>
      </div>
    </Link>
  );
}
