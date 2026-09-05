"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function SectionHeader({
  title,
  subtitle,
  href,
  hrefLabel,
  icon,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  icon?: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-primary [&_svg]:w-5 [&_svg]:h-5">{icon}</span>}
        <div>
          <h2 className="text-lg md:text-xl font-extrabold">{title}</h2>
          {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="text-sm font-bold text-muted hover:text-primary transition-colors shrink-0"
        >
          {hrefLabel ?? t.common.viewAll}
        </Link>
      )}
    </div>
  );
}
