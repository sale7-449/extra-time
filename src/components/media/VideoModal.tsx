"use client";

import { useEffect } from "react";
import type { MediaItem } from "@/lib/types";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CloseIcon } from "@/components/icons";
import { getPlayerSource } from "@/lib/media-kind";

/**
 * مشغّل الفيديو العام. يختار العنصر الصحيح حسب نوع الرابط الفعلي (lib/media-kind):
 * يوتيوب → iframe تضمين رسمي، ملف فيديو (مرفوع أو رابط مباشر) → <video> بمشغّل
 * المتصفح الأصلي، وأي رابط آخر → بطاقة رابط تُفتَح خارجياً — لا iframe لملف mp4
 * (يُحمَّل ولا يُشغَّل على iOS) ولا مشغّل مكسور صامت. لا تنزيل ولا استضافة ذاتية
 * لفيديو يوتيوب. رابط "المشاهدة على المصدر" يبقى متاحاً دائماً كبديل مضمون.
 *
 * لمس الجوال: شريط الإغلاق فوق الفيديو (لا زر عائم فوق الـiframe يعترض لمسه)، ولا
 * backdrop-filter على الطبقة التي تحوي iframe/video (يُسبّب على WebKit فيديو
 * غير مستجيب أو أسود).
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

  const source = getPlayerSource(item.embedUrl, item.sourceUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-[var(--radius-lg)] bg-surface border border-border shadow-[var(--shadow-card)] overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="min-w-0 truncate text-xs font-bold text-muted-dim">{item.source}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.videos.close}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink hover:bg-border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-video w-full bg-black">
          {source?.kind === "YOUTUBE" ? (
            <iframe
              src={source.embedUrl}
              title={item.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : source?.kind === "VIDEO_FILE" ? (
            <video
              src={source.src}
              className="absolute inset-0 w-full h-full bg-black"
              controls
              playsInline
              autoPlay
              preload="metadata"
              poster={item.thumbnailUrl ?? undefined}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted">
              <p className="line-clamp-3">{item.title}</p>
              {source?.kind === "LINK" && (
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-primary px-5 text-sm font-bold text-primary-ink"
                >
                  {t.videos.watchAtSource}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold leading-snug line-clamp-2">{item.title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-4 flex items-center rounded-[var(--radius-sm)] border border-border text-xs font-bold text-muted hover:text-ink hover:border-primary/40 transition-colors"
            >
              {source?.kind === "YOUTUBE" ? t.videos.watchOnYouTube : t.videos.watchAtSource}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
