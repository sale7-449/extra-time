import Link from "next/link";
import { getCurrentUser, getUserFavorites } from "@/lib/services/favorites.service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOutAction } from "@/lib/actions/auth.actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { UserIcon, TrophyIcon, MatchesIcon } from "@/components/icons";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.profile.title} — EXTRA TIME` };
}

export default async function ProfilePage() {
  const locale = await getServerLocale();
  const t = getMessages(locale);
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="container-page py-8 md:py-10">
        <h1 className="text-2xl font-extrabold mb-6">{t.profile.title}</h1>
        <EmptyState
          icon={<UserIcon />}
          title={t.profile.loginCta}
          description={isSupabaseConfigured() ? t.profile.loginCtaDesc : t.profile.notConfiguredDesc}
          action={
            isSupabaseConfigured() ? (
              <div className="flex gap-3">
                <Button href="/login">{t.common.login}</Button>
                <Button href="/signup" variant="secondary">
                  {t.common.signup}
                </Button>
              </div>
            ) : undefined
          }
        />
      </div>
    );
  }

  const favorites = await getUserFavorites();

  return (
    <div className="container-page py-8 md:py-10">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted [&_svg]:w-7 [&_svg]:h-7">
          <UserIcon />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">{user.displayName || t.profile.defaultUser}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <form action={signOutAction} className="ms-auto">
          <button
            type="submit"
            className="h-10 px-4 rounded-[var(--radius-sm)] border border-border text-sm font-bold text-muted hover:text-error hover:border-error/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t.common.logout}
          </button>
        </form>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <FavoritesSection title={t.profile.favoriteTeams} icon={<UserIcon />} items={favorites.teams} emptyText={t.profile.noFavoriteTeams} />
        <FavoritesSection title={t.profile.favoriteCompetitions} icon={<TrophyIcon />} items={favorites.competitions} emptyText={t.profile.noFavoriteCompetitions} hrefBase="/competitions" />
        <FavoritesSection title={t.profile.savedMatches} icon={<MatchesIcon />} items={favorites.matches} emptyText={t.profile.noSavedMatches} hrefBase="/matches" />
      </div>
    </div>
  );
}

function FavoritesSection({
  title,
  icon,
  items,
  emptyText,
  hrefBase,
}: {
  title: string;
  icon: React.ReactNode;
  items: { id: string; label: string }[];
  emptyText: string;
  hrefBase?: string;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4 text-primary [&_svg]:w-4 [&_svg]:h-4">
        {icon}
        <h2 className="text-sm font-extrabold text-ink">{title}</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-dim">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) =>
            hrefBase ? (
              <li key={item.id}>
                <Link href={`${hrefBase}/${item.id}`} className="text-sm font-bold hover:text-primary transition-colors">
                  {item.label}
                </Link>
              </li>
            ) : (
              <li key={item.id} className="text-sm font-bold">
                {item.label}
              </li>
            )
          )}
        </ul>
      )}
    </section>
  );
}
