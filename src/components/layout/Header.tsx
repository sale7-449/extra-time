"use client";

import Link from "next/link";
import { SearchIcon, BellIcon, UserIcon, ShieldIcon } from "@/components/icons";
import { Logo } from "@/components/shared/Logo";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const iconButton =
  "w-10 h-10 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-surface transition-colors [&_svg]:w-5 [&_svg]:h-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

export function Header({ isAdmin = false }: { isAdmin?: boolean }) {
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="shrink-0 rounded-[var(--radius-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Logo />
        </Link>

        <DesktopNav />

        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <Link href="/search" aria-label={t.nav.search} className={iconButton}>
            <SearchIcon />
          </Link>
          <button aria-label={t.nav.notifications} className={`hidden sm:flex ${iconButton}`}>
            <BellIcon />
          </button>
          {/* خانة الحساب: جلسة Admin فعّالة تحلّ محلّ زر الحساب/الدخول بزر Admin
              واضح ونصّي (وليس دائرة أيقونة) يذهب إلى /admin. جلسة Admin مستقلة عن
              جلسة المستخدم العادي: حساب المستخدم يبقى متاحاً من قائمة «المزيد»
              على الجوال وتذييل الموقع وصفحة لوحة المسؤول، ولا يتأثر دخوله. */}
          {isAdmin ? (
            <Link
              href="/admin"
              aria-label={t.nav.admin}
              title={t.nav.admin}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-xs font-extrabold text-primary hover:bg-primary/20 transition-colors [&_svg]:w-4 [&_svg]:h-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ShieldIcon />
              {t.nav.adminShort}
            </Link>
          ) : (
            <Link
              href="/profile"
              aria-label={t.nav.profile}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-border text-muted hover:text-primary hover:border-primary/40 transition-colors [&_svg]:w-5 [&_svg]:h-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <UserIcon />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
