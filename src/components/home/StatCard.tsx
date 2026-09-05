"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * عدّاد تصاعدي خفيف يبدأ فور ظهور البطاقة. لا يستدعي setState مباشرة داخل
 * جسم الـeffect (يُخالف قاعدة react-hooks/set-state-in-effect) — كل تحديث
 * يمر عبر callback غير متزامن لـ requestAnimationFrame.
 */
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return; // القيمة الابتدائية تساوي target أصلاً

    let frame: number;
    frame = requestAnimationFrame((startTime) => {
      function tick(now: number) {
        const progress = Math.min((now - startTime) / durationMs, 1);
        setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      }
      tick(startTime);
    });

    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

export function StatCard({ label, value, icon }: { label: string; value: number; icon?: ReactNode }) {
  const animated = useCountUp(value);
  const { locale } = useLocale();

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface p-5 flex flex-col items-center text-center gap-1">
      {icon && <span className="text-primary mb-1 [&_svg]:w-5 [&_svg]:h-5">{icon}</span>}
      <span className="text-3xl font-extrabold tabular" dir="ltr">
        {animated.toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
      </span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}
