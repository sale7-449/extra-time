"use client";

import { useTransition } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { setLocaleAction } from "@/lib/actions/locale.actions";
import { cx } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale } = useLocale();
  const [pending, startTransition] = useTransition();

  function switchTo(next: "ar" | "en") {
    if (next === locale || pending) return;
    startTransition(() => setLocaleAction(next));
  }

  return (
    <div
      className={cx(
        "flex items-center rounded-full border border-border bg-surface p-0.5 text-xs font-bold transition-opacity",
        pending && "opacity-60"
      )}
      dir="ltr"
      aria-busy={pending}
      role="group"
      aria-label="Language / اللغة"
    >
      <button
        onClick={() => switchTo("ar")}
        aria-pressed={locale === "ar"}
        className={cx(
          "h-7 px-2.5 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
          locale === "ar" ? "bg-primary text-primary-ink" : "text-muted hover:text-ink"
        )}
      >
        عربي
      </button>
      <button
        onClick={() => switchTo("en")}
        aria-pressed={locale === "en"}
        className={cx(
          "h-7 px-2.5 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
          locale === "en" ? "bg-primary text-primary-ink" : "text-muted hover:text-ink"
        )}
      >
        EN
      </button>
    </div>
  );
}
