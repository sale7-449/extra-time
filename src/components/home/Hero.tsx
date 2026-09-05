"use client";

import { Button } from "@/components/ui/Button";
import { PlayIcon, MatchesIcon } from "@/components/icons";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Hero سينمائي مبني بالكامل بـ CSS (إضاءات ملعب ليلية متعددة الطبقات + شبكة
 * تكتيكية + Vignette) بدل صورة خارجية غير مضمونة المصدر أو الاستقرار.
 */
export function Hero() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* الطبقة الخلفية: قاعدة داكنة */}
      <div className="absolute inset-0 bg-bg" />

      {/* أضواء الملعب — طبقتان متقاطعتان لعمق أكبر */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(65% 55% at 20% -5%, color-mix(in srgb, var(--primary) 22%, transparent) 0%, transparent 60%), radial-gradient(50% 45% at 85% 8%, color-mix(in srgb, var(--primary) 10%, transparent) 0%, transparent 55%), radial-gradient(60% 60% at 50% 105%, color-mix(in srgb, var(--primary) 6%, transparent) 0%, transparent 60%)",
        }}
      />

      {/* شبكة تكتيكية خافتة جداً */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 40px), repeating-linear-gradient(-45deg, #fff 0 1px, transparent 1px 40px)",
        }}
      />

      {/* حبيبات خفيفة (Grain) لإحساس سينمائي بدل مسطح رقمي */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.035] mix-blend-overlay" aria-hidden>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* Vignette للتركيز على المحتوى */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />

      <div className="container-page relative py-16 md:py-24 flex flex-col items-center text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
          EXTRA TIME
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.15] text-balance max-w-3xl">
          {t.home.heroTitle1}
          <br />
          {t.home.heroTitle2}
        </h1>
        <p className="mt-5 text-lg md:text-xl text-muted">{t.home.heroTagline}</p>

        <div className="mt-9 flex items-center gap-3">
          <Button href="/matches" size="lg" icon={<PlayIcon className="w-4 h-4" />}>
            {t.home.heroCtaStart}
          </Button>
          <Button href="/competitions" size="lg" variant="secondary">
            {t.home.heroCtaMore}
          </Button>
        </div>

        <div className="mt-10 flex items-center gap-2 text-xs font-bold text-muted-dim">
          <MatchesIcon className="w-4 h-4 text-primary" />
          {t.home.heroSub}
        </div>
      </div>
    </section>
  );
}
