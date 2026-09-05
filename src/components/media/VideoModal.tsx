"use client";

import { useEffect } from "react";
import type { MediaItem } from "@/lib/types";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CloseIcon } from "@/components/icons";

/**
 * تضمين رسمي (iframe) فقط — لا تنزيل ولا استضافة ذاتية للفيديو على الإطلاق.
 * إن مُنع التضمين لفيديو بعينه، يوتيوب نفسه يعرض رسالة بديلة داخل الإطار
 * (لا نتحقّق من isEmbeddable مسبقاً — غير متاح بلا YouTube Data API)، ويبقى
 * رابط "المشاهدة على يوتيوب" متاحاً دائماً كبديل مضمون.
 */
export function VideoModal({ open, onClose, item }: { open: boolean; onClose: () => void; item: MediaItem }) {
  const { t } = useLocale();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // قفل تمرير الخلفية أثناء فتح الـmodal — بلا هذا يمكن تمرير الصفحة خلف
  // الـmodal بشكل مربك (خصوصاً على الجوال)، والمستخدم يعود لنفس موضع تمريره
  // بالضبط عند الإغلاق لأن الصفحة نفسها لم تتحرك إطلاقاً.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-[var(--radius-lg)] bg-surface border border-border shadow-[var(--shadow-card)] overflow-hidden"
      >
        {/* زر إغلاق كبير وواضح فوق الفيديو مباشرة — لا ينعكس مكانه مع RTL
            (end-3 دائماً الزاوية "الخارجية" من اتجاه القراءة)، وحجمه 44px
            كحدّ أدنى (إرشادات إمكانية اللمس على الجوال). */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t.videos.close}
          className="absolute top-3 end-3 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        <div className="relative aspect-video w-full bg-black">
          {item.embedUrl ? (
            <iframe
              src={item.embedUrl}
              title={item.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted text-sm p-6 text-center">
              {item.title}
            </div>
          )}
        </div>
        <div className="p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold leading-snug line-clamp-2">{item.title}</h3>
            <p className="mt-1 text-xs text-muted-dim">{item.source}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 flex items-center rounded-[var(--radius-sm)] border border-border text-xs font-bold text-muted hover:text-ink hover:border-primary/40 transition-colors"
            >
              {t.videos.watchOnYouTube}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
