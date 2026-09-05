"use client";

import { useFollow } from "@/lib/follow/FollowProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cx } from "@/lib/utils";

type FollowTarget =
  | { kind: "team"; id: string; name: string; logoUrl: string | null }
  | { kind: "competition"; id: string; name: string; logoUrl: string | null };

/**
 * زر متابعة فريق/بطولة — محلي بالكامل (localStorage عبر FollowProvider)، لا
 * حساب ولا backend. مستقل عن نظام "المفضلة" القديم (favorites.service.ts)
 * المبني على Supabase وغير المُفعَّل في هذه البيئة أصلاً — هذا نظام Phase 5
 * الحقيقي والوحيد الفعّال حالياً.
 */
export function FollowButton({ target, className }: { target: FollowTarget; className?: string }) {
  const { t } = useLocale();
  const { isFollowingTeam, isFollowingCompetition, followTeam, unfollowTeam, followCompetition, unfollowCompetition } =
    useFollow();

  const following = target.kind === "team" ? isFollowingTeam(target.id) : isFollowingCompetition(target.id);

  function toggle() {
    if (target.kind === "team") {
      if (following) unfollowTeam(target.id);
      else followTeam({ id: target.id, name: target.name, logoUrl: target.logoUrl });
    } else {
      if (following) unfollowCompetition(target.id);
      else followCompetition({ id: target.id, name: target.name, logoUrl: target.logoUrl });
    }
  }

  const ariaLabel = following
    ? target.kind === "team"
      ? t.follow.unfollowTeam
      : t.follow.unfollowCompetition
    : target.kind === "team"
      ? t.follow.followTeam
      : t.follow.followCompetition;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={following}
      aria-label={`${ariaLabel}: ${target.name}`}
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        following
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-surface text-muted hover:text-primary hover:border-primary/40",
        className
      )}
    >
      {following ? t.follow.following : t.follow.follow}
    </button>
  );
}
