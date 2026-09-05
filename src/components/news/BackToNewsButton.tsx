"use client";

import { useRouter } from "next/navigation";
import { BackIcon } from "@/components/icons";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * زر رجوع ذكي — router.back() إن وُجد history فعلي ضمن هذا التبويب (المستخدم
 * فعلاً جاء من صفحة أخرى في الموقع، أو من مرجع خارجي له history)، وإلا رجوع
 * صريح إلى `/news` بدل الاعتماد فقط على زر المتصفح أو ترك المستخدم عالقاً.
 * الفحص يحدث لحظة الضغط نفسها (لا state/effect منفصلَين لهذا) — أدقّ من
 * تخزين قيمة عند التحميل قد تتغيّر لاحقاً أثناء بقاء المستخدم في الصفحة.
 */
export function BackToNewsButton({ variant = "top" }: { variant?: "top" | "bottom" }) {
  const router = useRouter();
  const { t } = useLocale();

  function handleBack() {
    if (window.history.length > 1) router.back();
    else router.push("/news");
  }

  if (variant === "bottom") {
    return (
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 h-11 px-5 rounded-[var(--radius-sm)] border border-border text-sm font-bold text-muted hover:text-ink hover:border-primary/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <BackIcon className="w-4 h-4" />
        {t.news.backToNews}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink transition-colors mb-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <BackIcon className="w-4 h-4" />
      {t.news.backToNews}
    </button>
  );
}
