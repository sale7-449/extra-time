"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="hidden md:block border-t border-border mt-16">
      <div className="container-page py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-muted text-sm">{t.home.heroTagline}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/matches" className="hover:text-ink transition-colors">{t.nav.matches}</Link>
          <Link href="/news" className="hover:text-ink transition-colors">{t.nav.news}</Link>
          <Link href="/videos" className="hover:text-ink transition-colors">{t.nav.videos}</Link>
          <Link href="/competitions" className="hover:text-ink transition-colors">{t.nav.competitions}</Link>
          <Link href="/stats" className="hover:text-ink transition-colors">{t.nav.stats}</Link>
        </nav>
        <p className="text-xs text-muted-dim">© {new Date().getFullYear()} Extra Time</p>
      </div>
    </footer>
  );
}
