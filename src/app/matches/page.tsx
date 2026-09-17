import { SectionHeader } from "@/components/shared/SectionHeader";
import { LiveMatchCard } from "@/components/home/LiveMatchCard";
import { MatchCard } from "@/components/shared/MatchCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLiveMatches, getUpcomingMatches } from "@/lib/services/matches.service";
import type { Match } from "@/lib/types";
import { FireIcon, MatchesIcon } from "@/components/icons";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";
import { dayKeyInDisplayTz, formatWeekDayHeading } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/messages";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.nav.matches} — EXTRA TIME` };
}

function sortByKickoff(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));
}

export default async function MatchesPage() {
  const locale = await getServerLocale();
  const t = getMessages(locale);
  const [liveResult, todayResult, tomorrowResult, weekResult] = await Promise.all([
    getLiveMatches(),
    getUpcomingMatches("today"),
    getUpcomingMatches("tomorrow"),
    getUpcomingMatches("week"),
  ]);

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayKey = dayKeyInDisplayTz(now.toISOString());
  const tomorrowKey = dayKeyInDisplayTz(tomorrow.toISOString());
  // "week" يشمل مبارياته أصلاً اليوم والغد ضمن نافذته السباعية — نستبعدهما
  // هنا صراحة كي لا تتكرر مبارياتهما مرتين على الصفحة (لهما قسماهما
  // المستقلان أعلاه)، فيبقى قسم "هذا الأسبوع" لبقية الأيام فقط.
  const restOfWeekMatches = weekResult.matches.filter((m) => {
    const key = dayKeyInDisplayTz(m.kickoff);
    return key !== todayKey && key !== tomorrowKey;
  });

  return (
    <div className="container-page py-8 md:py-10 space-y-12">
      <h1 className="text-2xl font-extrabold">{t.nav.matches}</h1>

      {liveResult.matches.length > 0 && (
        <section>
          <SectionHeader title={t.home.liveNow} icon={<FireIcon />} />
          <div className="grid gap-4 sm:grid-cols-2">
            {liveResult.matches.map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      <MatchGroup
        title={t.common.today}
        matches={sortByKickoff(todayResult.matches)}
        unavailable={todayResult.unavailable}
        noneText={t.common.noMatchesPeriod}
        unavailableTitle={t.common.dataUnavailable}
        unavailableDesc={t.common.dataUnavailableDesc}
      />
      <MatchGroup
        title={t.common.tomorrow}
        matches={sortByKickoff(tomorrowResult.matches)}
        unavailable={tomorrowResult.unavailable}
        noneText={t.common.noMatchesPeriod}
        unavailableTitle={t.common.dataUnavailable}
        unavailableDesc={t.common.dataUnavailableDesc}
      />

      <section>
        <SectionHeader title={t.common.thisWeek} icon={<MatchesIcon />} />
        {weekResult.unavailable ? (
          <EmptyState title={t.common.dataUnavailable} description={t.common.dataUnavailableDesc} />
        ) : restOfWeekMatches.length > 0 ? (
          <WeekByDay matches={restOfWeekMatches} locale={locale} todayLabel={t.common.today} tomorrowLabel={t.common.tomorrow} />
        ) : (
          <EmptyState title={t.common.noMatchesPeriod} />
        )}
      </section>
    </div>
  );
}

function MatchGroup({
  title,
  matches,
  unavailable,
  noneText,
  unavailableTitle,
  unavailableDesc,
}: {
  title: string;
  matches: Match[];
  unavailable: boolean;
  noneText: string;
  unavailableTitle: string;
  unavailableDesc: string;
}) {
  return (
    <section>
      <SectionHeader title={title} />
      {matches.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      ) : unavailable ? (
        <EmptyState title={unavailableTitle} description={unavailableDesc} />
      ) : (
        <EmptyState title={noneText} />
      )}
    </section>
  );
}

/** مباريات الأسبوع مجمَّعة حسب اليوم التقويمي (بتوقيت الرياض، انظر
 * dayKeyInDisplayTz) بدل قائمة مسطَّحة واحدة — كل يوم بعنوان واضح ("اليوم —
 * الخميس ١٧ سبتمبر") ومبارياته مرتَّبة زمنياً، بترتيب أيام تصاعدي. */
function WeekByDay({
  matches,
  locale,
  todayLabel,
  tomorrowLabel,
}: {
  matches: Match[];
  locale: Locale;
  todayLabel: string;
  tomorrowLabel: string;
}) {
  const byDay = new Map<string, Match[]>();
  for (const m of matches) {
    const key = dayKeyInDisplayTz(m.kickoff);
    const list = byDay.get(key);
    if (list) list.push(m);
    else byDay.set(key, [m]);
  }

  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, dayMatches]) => ({
      key,
      matches: dayMatches.sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff)),
    }));

  return (
    <div className="space-y-7">
      {days.map((day) => (
        <div key={day.key}>
          <h3 className="text-sm font-bold text-muted mb-3 pb-2 border-b border-border">
            {formatWeekDayHeading(day.matches[0].kickoff, locale, todayLabel, tomorrowLabel)}
          </h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {day.matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
