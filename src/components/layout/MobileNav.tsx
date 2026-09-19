"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, MatchesIcon, NewsIcon, TrophyIcon, UserIcon, MoreIcon } from "@/components/icons";
import { cx } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Modal } from "@/components/ui/Modal";

export function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [moreOpen, setMoreOpen] = useState(false);

  const items = [
    { href: "/", label: t.nav.home, Icon: HomeIcon },
    { href: "/matches", label: t.nav.matches, Icon: MatchesIcon },
    { href: "/news", label: t.nav.news, Icon: NewsIcon },
    { href: "/competitions", label: t.nav.competitions, Icon: TrophyIcon },
    { href: "/profile", label: t.nav.profile, Icon: UserIcon },
  ];

  const moreItems = [
    { href: "/following", label: t.nav.following },
    { href: "/results", label: t.nav.results },
    { href: "/videos", label: t.nav.videos },
    { href: "/transfers", label: t.nav.transfers },
    { href: "/stats", label: t.nav.stats },
    ...(isAdmin ? [{ href: "/admin", label: t.nav.admin }] : []),
  ];

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 w-full overflow-hidden border-t border-border bg-bg/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-6">
          {items.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cx(
                  "flex min-w-0 flex-col items-center justify-center gap-1 h-16 text-[11px] font-bold transition-colors",
                  active ? "text-primary" : "text-muted"
                )}
              >
                <Icon className="w-6 h-6 shrink-0" />
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={cx(
              "flex min-w-0 flex-col items-center justify-center gap-1 h-16 text-[11px] font-bold transition-colors",
              isMoreActive ? "text-primary" : "text-muted"
            )}
          >
            <MoreIcon className="w-6 h-6 shrink-0" />
            <span className="w-full truncate text-center">{t.nav.more}</span>
          </button>
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t.nav.more}>
        <div className="space-y-2">
          {moreItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className="flex h-11 items-center px-4 rounded-[var(--radius-sm)] border border-border bg-surface font-bold hover:border-primary/40 hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}
