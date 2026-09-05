"use client";

import { cx } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * عرض النتيجة — العنصر البصري الأهم في المنصة. أرقام كبيرة، Tabular،
 * ولون النيون يظهر فقط أثناء البث المباشر.
 */
export function ScoreDisplay({
  home,
  away,
  live = false,
  size = "md",
}: {
  home: number | null;
  away: number | null;
  live?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { t } = useLocale();
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl md:text-6xl",
  }[size];

  if (home === null || away === null) {
    return <span className={cx("font-extrabold text-muted tabular", sizeClasses)}>{t.common.vs}</span>;
  }

  // مبني كـ flex بدل نص واحد ثنائي الاتجاه: الفريق الأول (Home) هو أول عنصر
  // DOM فيظهر يميناً في RTL — بنفس منطق تموضع بطاقتي الفريقين المحيطتين،
  // فلا ينفصل الرقم عن فريقه بصرياً. كل رقم منفرد dir="ltr" لمنع أرقام
  // متعددة الخانات (مثل 10) من الانعكاس داخلياً بخوارزمية bidi.
  return (
    <div
      className={cx("flex items-center gap-2 font-extrabold tabular leading-none", sizeClasses, live ? "text-primary" : "text-ink")}
      style={live ? { filter: "drop-shadow(0 0 18px color-mix(in srgb, var(--primary) 45%, transparent))" } : undefined}
    >
      <span dir="ltr">{home}</span>
      <span className="opacity-50">-</span>
      <span dir="ltr">{away}</span>
    </div>
  );
}
