"use client";

import { useEffect, useState } from "react";
import { useFollow } from "@/lib/follow/FollowProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getFollowingFeed, type FollowingFeed } from "@/lib/actions/following.actions";
import { MatchCard } from "@/components/shared/MatchCard";
import { NewsCard } from "@/components/home/NewsCard";
import { MediaCard } from "@/components/media/MediaCard";
import { FollowButton } from "@/components/shared/FollowButton";
import { CompetitionLogo } from "@/components/shared/CompetitionLogo";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MatchesIcon, NewsIcon, PlayIcon } from "@/components/icons";
import { localizeTeamName, localizeCompetitionName } from "@/lib/i18n/localized-names";

/**
 * "متابَعاتي" — بيانات حقيقية فقط، مبنية بالكامل من IDs/أسماء حقيقية محفوظة
 * محلياً (FollowProvider، لا حساب/backend في هذه المرحلة — راجع
 * lib/follow). لا نبني fetch على السيرفر لأن "ماذا نجلب" يعتمد على
 * localStorage (متاح للعميل فقط) — الجسم التفاعلي كامل عميل، وتستدعي
 * getFollowingFeed (Server Action) بمجرد معرفة من يتابعه المستخدم فعلياً.
 * (عنوان الصفحة generateMetadata يُعرَّف في page.tsx — مكوّن سيرفر منفصل،
 * لأن مكوّنات "use client" لا يمكنها تصدير generateMetadata.)
 */
export function FollowingView() {
  const { t, locale } = useLocale();
  const { followedTeams, followedCompetitions } = useFollow();
  const [feed, setFeed] = useState<FollowingFeed | null>(null);

  const hasFollowing = followedTeams.length > 0 || followedCompetitions.length > 0;
  // "جارٍ التحميل" مُشتقّة لا حالة منفصلة — بلا حاجة لـsetState إضافي داخل
  // الـeffect (يُخالف react-hooks/set-state-in-effect): يتابع شيئاً فعلاً
  // لكن النتيجة لم تصل بعد = جارٍ التحميل، بلا أكثر.
  const loading = hasFollowing && feed === null;

  useEffect(() => {
    // لا حاجة لتصفير feed هنا — الواجهة أصلاً لا تعرضها إلا ضمن hasFollowing
    // (راجع الشرط في الـJSX أدناه)، فتبقى قيمتها القديمة غير مرئية بأمان.
    if (!hasFollowing) return;
    let cancelled = false;
    getFollowingFeed(
      followedTeams.map((team) => team.name),
      followedCompetitions.map((c) => c.id),
      locale
    ).then((result) => {
      if (!cancelled) setFeed(result);
    });
    return () => {
      cancelled = true;
    };
  }, [followedTeams, followedCompetitions, hasFollowing, locale]);

  const totalContent = feed ? feed.matches.length + feed.news.length + feed.videos.length : 0;

  return (
    <div className="container-page py-6 md:py-10">
      <h1 className="text-2xl font-extrabold mb-2">{t.follow.pageTitle}</h1>
      <p className="text-sm text-muted mb-8">{t.follow.pageSubtitle}</p>

      {!hasFollowing ? (
        <EmptyState
          title={t.follow.emptyTitle}
          description={t.follow.emptyDesc}
          action={<Button href="/search">{t.follow.emptyCta}</Button>}
        />
      ) : (
        <div className="space-y-10">
          {/* قائمة المتابَعين أنفسهم مرئية دائماً، بغض النظر عن توفر محتوى
              حالياً لها — إلغاء المتابعة ممكن مباشرة من هنا أيضاً. */}
          <section className="flex flex-wrap gap-2">
            {followedTeams.map((team) => (
              <div key={team.id} className="flex items-center gap-2 rounded-full border border-border bg-surface ps-3 pe-1 h-9">
                <span className="text-sm font-bold">{localizeTeamName(team.name, locale)}</span>
                <FollowButton target={{ kind: "team", ...team }} />
              </div>
            ))}
            {followedCompetitions.map((comp) => (
              <div key={comp.id} className="flex items-center gap-2 rounded-full border border-border bg-surface ps-3 pe-1 h-9">
                <CompetitionLogo logoUrl={comp.logoUrl} name={comp.name} size={18} />
                <span className="text-sm font-bold">{localizeCompetitionName(comp.name, comp.id, locale)}</span>
                <FollowButton target={{ kind: "competition", ...comp }} />
              </div>
            ))}
          </section>

          {loading ? (
            <p className="text-sm text-muted-dim">{t.common.loading}</p>
          ) : feed && totalContent === 0 ? (
            <EmptyState title={t.follow.noContentTitle} description={t.follow.noContentDesc} />
          ) : feed ? (
            <>
              {feed.matches.length > 0 && (
                <section>
                  <SectionHeader title={t.nav.matches} icon={<MatchesIcon />} />
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {feed.matches.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                </section>
              )}

              {feed.news.length > 0 && (
                <section>
                  <SectionHeader title={t.nav.news} icon={<NewsIcon />} />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {feed.news.map((article) => (
                      <NewsCard key={article.id} article={article} />
                    ))}
                  </div>
                </section>
              )}

              {feed.videos.length > 0 && (
                <section>
                  <SectionHeader title={t.nav.videos} icon={<PlayIcon />} />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {feed.videos.map((item) => (
                      <MediaCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
