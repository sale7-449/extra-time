"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function DesktopNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const navItems = [
    { href: "/", label: t.nav.home },
    { href: "/matches", label: t.nav.matches },
    { href: "/results", label: t.nav.results },
    { href: "/news", label: t.nav.news },
    { href: "/videos", label: t.nav.videos },
    { href: "/transfers", label: t.nav.transfers },
    { href: "/competitions", label: t.nav.competitions },
    { href: "/stats", label: t.nav.stats },
    { href: "/following", label: t.nav.following },
  ];

  return (
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "px-3.5 h-9 flex items-center rounded-[var(--radius-sm)] text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
              active ? "text-ink bg-surface" : "text-muted hover:text-ink hover:bg-surface"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
