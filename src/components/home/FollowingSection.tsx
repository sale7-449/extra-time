"use client";

import { useEffect, useState } from "react";
import { useFollow } from "@/lib/follow/FollowProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getFollowingFeed, type FollowingFeed } from "@/lib/actions/following.actions";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { MatchCard } from "@/components/shared/MatchCard";
import { NewsCard } from "@/components/home/NewsCard";
import { Button } from "@/components/ui/Button";
import { FireIcon } from "@/components/icons";

/**
 * قسم مضغوط جداً على الرئيسية — لا يزدحم بها إطلاقاً: CTA سطر واحد إن لم
 * يتابع المستخدم شيئاً بعد، أو أقرب مباراتين + أحدث خبر فقط إن تابع (لا
 * فيديوهات هنا — التفاصيل الكاملة في /following). عميل بالكامل لأن معرفة
 * "من يتابع المستخدم" ممكنة فقط من localStorage.
 */
export function FollowingSection() {
  const { t, locale } = useLocale();
  const { followedTeams, followedCompetitions } = useFollow();
  const [feed, setFeed] = useState<FollowingFeed | null>(null);
  const hasFollowing = followedTeams.length > 0 || followedCompetitions.length > 0;

  useEffect(() => {
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
  }, [hasFollowing, followedTeams, followedCompetitions, locale]);

  if (!hasFollowing) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-border bg-surface-2 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-extrabold">{t.follow.homeCta}</p>
          <p className="text-sm text-muted mt-0.5">{t.follow.homeCtaDesc}</p>
        </div>
        <Button href="/search" size="sm">
          {t.search.submit}
        </Button>
      </section>
    );
  }

  if (!feed || (feed.matches.length === 0 && feed.news.length === 0)) return null;

  return (
    <section>
      <SectionHeader title={t.follow.homeSectionTitle} icon={<FireIcon />} href="/following" />
      <div className="grid gap-6 lg:grid-cols-2">
        {feed.matches.length > 0 && (
          <div className="space-y-2.5">
            {feed.matches.slice(0, 3).map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
        {feed.news.length > 0 && (
          <div className="space-y-4">
            {feed.news.slice(0, 2).map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
