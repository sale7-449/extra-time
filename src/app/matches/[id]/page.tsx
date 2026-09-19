import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatch } from "@/lib/services/matches.service";
import { getCompetition } from "@/lib/services/competitions.service";
import { getNewsPool } from "@/lib/services/news.service";
import { getMatchMedia } from "@/lib/services/media.service";
import { findMatchNews } from "@/lib/match-news-matcher";
import { safeResolve } from "@/lib/errors";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { ScoreDisplay } from "@/components/shared/ScoreDisplay";
import { MatchStatusBadge } from "@/components/shared/MatchStatusBadge";
import { MatchDetailTabs } from "@/components/match/MatchDetailTabs";
import { MatchScorers } from "@/components/match/MatchScorers";
import { MatchShareButton } from "@/components/match/MatchShareButton";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { FollowButton } from "@/components/shared/FollowButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StoryTrigger } from "@/components/story/StoryTrigger";
import { SnapchatCreativeKitButton } from "@/components/story/SnapchatCreativeKitButton";
import { toMatchResultContentItem, toGoalContentItem } from "@/lib/providers/social/content-builders";
import { isFavorited } from "@/lib/services/favorites.service";
import { BackIcon } from "@/components/icons";
import { formatKickoffTime, formatMatchDate } from "@/lib/utils";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [{ match }, t] = await Promise.all([getMatch(id), getServerLocale().then(getMessages)]);
  if (!match) return { title: `${t.common.notAvailable} — EXTRA TIME` };

  const title = `${match.homeTeam.name} × ${match.awayTeam.name} — EXTRA TIME`;
  const description =
    match.status === "SCHEDULED"
      ? `${match.homeTeam.name} × ${match.awayTeam.name}`
      : `${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name}`;

  // og:image كان غائباً تماماً لصفحة المباراة — يتحقّق منه Snapchat Creative
  // Kit (وأي معاينة رابط أخرى) لتوليد الملصق التلقائي. شعار البطولة أولاً
  // (يمثّل الحدث نفسه لا فريقاً واحداً)، ثم شعار الفريق المضيف احتياطاً —
  // كلاهما بيانات حقيقية من المصدر نفسه، لا صورة مُختلَقة. undefined صراحة
  // إن لم يتوفر أي منهما.
  const competition = await getCompetition(match.competitionId);
  const ogImage = competition?.logoUrl ?? match.homeTeam.logoUrl ?? undefined;

  return {
    title,
    description,
    // siteName مكرَّر هنا عمداً رغم وجوده في layout.tsx الجذري — Next.js لا
    // يدمج كائن openGraph عبر شجرة layout/page كما افتُرض سابقاً، بل يستبدله
    // كاملاً إن عرّفته الصفحة الفرعية (تأكَّد فعلياً عبر فحص HTML المُخرَج
    // فوق نفق Cloudflare العام: og:site_name كان غائباً هنا رغم وجوده في
    // layout.tsx، وموجوداً فقط في الصفحة الرئيسية التي لا تُعرّف openGraph
    // خاصاً بها).
    openGraph: { title, description, siteName: "EXTRA TIME", images: ogImage ? [{ url: ogImage }] : undefined },
  };
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getServerLocale();
  const t = getMessages(locale);
  const [{ match, unavailable }, newsPool] = await Promise.all([
    getMatch(id),
    safeResolve(getNewsPool(locale), [], "match-related-news"),
  ]);

  if (!match) {
    if (unavailable) {
      return (
        <div className="container-page py-24">
          <EmptyState title={t.common.dataUnavailable} description={t.common.dataUnavailableDesc} />
        </div>
      );
    }
    notFound();
  }

  // خبر "متعلق بالمباراة" فقط إن ذكر كلا الفريقين معاً — لا عرض أخبار عامة
  // تحت عنوان يوحي بأنها خاصة بهذه المباراة (راجع match-news-matcher.ts).
  const matchNews = findMatchNews(match, newsPool);

  const [competition, matchFavorited, matchMedia] = await Promise.all([
    getCompetition(match.competitionId),
    isFavorited("match", match.id),
    safeResolve(getMatchMedia(match, locale), [], "match-media"),
  ]);
  const matchLabel = `${match.homeTeam.name} × ${match.awayTeam.name}`;
  const matchPath = `/matches/${match.id}`;

  // Story من بيانات حقيقية فقط — toMatchResultContentItem/toGoalContentItem
  // (راجع lib/providers/social/content-builders.ts) تُعيدان null بصدق عند
  // نقص البيانات (مباراة لم تُلعَب، هدّاف غير موثوق)، فـStoryTrigger لا يُعرض
  // إطلاقاً حينها (لا زر يفتح على "بيانات غير كافية").
  const matchResultItem = toMatchResultContentItem(match);
  const goalItems = match.events
    .filter((e) => e.type === "GOAL")
    .map((e) => toGoalContentItem(match, e))
    .filter((item) => item !== null);

  return (
    <div className="container-page py-6 md:py-10">
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink transition-colors mb-6"
      >
        <BackIcon className="w-4 h-4" />
        {t.common.backToMatches}
      </Link>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 md:p-10 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-center gap-x-3 gap-y-1 text-center mb-8 relative">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
            {competition && (
              <span className="inline-flex items-center gap-2">
                <span className="text-sm font-bold text-primary">{competition.name}</span>
                <FollowButton target={{ kind: "competition", id: competition.id, name: competition.name, logoUrl: competition.logoUrl }} />
              </span>
            )}
            {match.round && <span className="text-sm text-muted-dim">· {match.round}</span>}
          </div>
          <div className="absolute end-0">
            <FavoriteButton kind="match" id={match.id} label={matchLabel} initiallyFavorited={matchFavorited} path={matchPath} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 md:gap-10 max-w-2xl mx-auto">
          <div className="flex flex-1 min-w-0 flex-col items-center gap-3">
            <TeamLogo team={match.homeTeam} size="xl" />
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-base md:text-xl font-extrabold text-center leading-tight break-words">{match.homeTeam.name}</span>
              <FollowButton
                target={{ kind: "team", id: match.homeTeam.id, name: match.homeTeam.name, logoUrl: match.homeTeam.logoUrl }}
              />
            </div>
            <MatchScorers events={match.events} teamId={match.homeTeam.id} />
          </div>

          <div className="flex flex-col items-center gap-2.5 shrink-0">
            <ScoreDisplay home={match.homeScore} away={match.awayScore} live={match.status === "LIVE"} size="lg" />
            <div className="flex flex-col items-center gap-1">
              <MatchStatusBadge status={match.status} minute={match.minute} />
              {/* التاريخ والوقت معاً دائماً (لا أحدهما فقط حسب الحالة) —
                  تحته لا بجانبه: بجانبه كان يوسّع العمود المركزي (shrink-0)
                  بما يكفي لكسر التخطيط أفقياً على 375px مع أسماء فرق طويلة
                  (Rayo Vallecano) — تأكَّد الأمر فعلياً عبر لقطة شاشة حقيقية. */}
              <span className="text-xs font-bold text-muted tabular whitespace-nowrap" dir="ltr">
                {formatMatchDate(match.kickoff, locale)}
                {" · "}
                {formatKickoffTime(match.kickoff, locale)}
              </span>
              {/* الملعب هنا أيضاً (لا فقط داخل تبويب Overview) — جزء من
                  ملخص المباراة الأساسي المرئي فوراً بلا نقر إضافي، إن توفّر. */}
              {match.venue && (
                <span className="text-[11px] text-muted-dim text-center max-w-[220px] truncate">{match.venue}</span>
              )}
            </div>
          </div>

          <div className="flex flex-1 min-w-0 flex-col items-center gap-3">
            <TeamLogo team={match.awayTeam} size="xl" />
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-base md:text-xl font-extrabold text-center leading-tight break-words">{match.awayTeam.name}</span>
              <FollowButton
                target={{ kind: "team", id: match.awayTeam.id, name: match.awayTeam.name, logoUrl: match.awayTeam.logoUrl }}
              />
            </div>
            <MatchScorers events={match.events} teamId={match.awayTeam.id} />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <MatchShareButton match={match} />
          <StoryTrigger item={matchResultItem} label={t.story.createStory} modalTitle={t.story.matchResultTitle} />
          <SnapchatCreativeKitButton path={matchPath} />
        </div>

        {goalItems.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {goalItems.map((goalItem) => (
              <StoryTrigger
                key={goalItem.id}
                item={goalItem}
                label={goalItem.title}
                modalTitle={t.story.goalTitle}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border bg-surface-2 text-xs font-bold text-muted hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              />
            ))}
          </div>
        )}
      </div>

      {/* فيديوهات المباراة أصبحت تبويباً مستقلاً ضمن MatchDetailTabs (راجع
          الملف) بدل قسم ثابت هنا — يظهر فقط لمباراة بدأت/انتهت فعلاً، بنفس
          معيار تعطيل بقية التبويبات حسب البيانات الفعلية. */}
      <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-surface p-6 md:p-8">
        <MatchDetailTabs match={match} matchNews={matchNews} matchMedia={matchMedia} />
      </div>
    </div>
  );
}
