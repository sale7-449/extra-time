import { getLeagueStats } from "@/lib/services/stats.service";
import { EmptyState } from "@/components/ui/EmptyState";
import { FireIcon } from "@/components/icons";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.stats.title} — EXTRA TIME` };
}

const ENGLISH_TAGS = { goals: "GOALS", matches: "MATCHES" };

export default async function StatsPage() {
  const t = getMessages(await getServerLocale());
  const stats = await getLeagueStats();
  const hasData = stats.matchesPlayed > 0;

  return (
    <div className="container-page py-8 md:py-10">
      <h1 className="text-2xl font-extrabold mb-2">{t.stats.title}</h1>
      <p className="text-sm text-muted mb-8">{t.stats.subtitle}</p>

      {!hasData ? (
        <EmptyState icon={<FireIcon />} title={t.stats.noData} description={t.stats.noDataDesc} />
      ) : (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <BigStat label={ENGLISH_TAGS.goals} localLabel={t.stats.goals} value={stats.goals} />
          <BigStat label={ENGLISH_TAGS.matches} localLabel={t.stats.matches} value={stats.matchesPlayed} />
        </div>
      )}
    </div>
  );
}

function BigStat({ label, localLabel, value }: { label: string; localLabel: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-dim" dir="ltr">
        {label}
      </span>
      <span className="text-4xl md:text-5xl font-extrabold tabular leading-none" dir="ltr">
        {value.toLocaleString("en-US")}
      </span>
      <span className="text-sm text-muted mt-1">{localLabel}</span>
    </div>
  );
}
