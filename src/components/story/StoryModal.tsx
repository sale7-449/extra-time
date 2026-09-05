"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentItem } from "@/lib/providers/social/types";
import { generateStoryImage, STORY_WIDTH, STORY_HEIGHT } from "@/lib/story";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CloseIcon } from "@/components/icons";

type GenerationState = "generating" | "success" | "insufficient" | "error";

/**
 * canvas واحد فعلي بمقاس 1080×1920 دائماً (raw buffer) — الـPreview مجرّد
 * تحجيم CSS للعرض فقط (لا نسخة منفصلة)، فالملف المُصدَّر (تنزيل/مشاركة) هو
 * نفس المحتوى الحقيقي المعروض حرفياً، بلا فارق جودة أو بيانات بين ما يراه
 * المستخدم وما يُصدَّر.
 */
export function StoryModal({
  open,
  onClose,
  item,
  title,
}: {
  open: boolean;
  onClose: () => void;
  item: ContentItem | null;
  title: string;
}) {
  const { t, locale } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<GenerationState>("generating");
  // يُحسَب مرة واحدة عند أول رسم لهذا المكوّن (lazy initializer، لا Effect) —
  // المكوّن أصلاً لا يُركَّب إلا على العميل (يُعيد null قبل فتحه، وفتحه نفسه
  // حدث نقر عميل)، فلا داعي أصلاً لتأجيل الفحص إلى Effect منفصل، ولا خطر
  // hydration mismatch (SSR لا يصل هذا الفرع إطلاقاً).
  const [canShareFiles, setCanShareFiles] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function"
  );

  useEffect(() => {
    if (!open || !item || !canvasRef.current) return;
    let cancelled = false;
    setState("generating");

    generateStoryImage(item, canvasRef.current, locale)
      .then((ok) => {
        if (!cancelled) setState(ok ? "success" : "insufficient");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [open, item, locale]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  function getBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function handleDownload() {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extra-time-story-${item?.id ?? "story"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const blob = await getBlob();
    if (!blob || !item) return;
    const file = new File([blob], "extra-time-story.png", { type: "image/png" });
    if (!navigator.canShare({ files: [file] })) {
      setCanShareFiles(false);
      return;
    }
    try {
      await navigator.share({ files: [file], title: item.title, text: item.title });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return; // المستخدم أغلق نافذة المشاركة بنفسه
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-[var(--radius-lg)] bg-surface border border-border shadow-[var(--shadow-card)] p-5"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="absolute top-3 end-3 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        <h3 className="text-sm font-extrabold mb-4">{title}</h3>

        <div
          className="relative mx-auto rounded-[var(--radius-md)] overflow-hidden border border-border bg-surface-2"
          style={{ width: "min(72vw, 300px)", aspectRatio: `${STORY_WIDTH} / ${STORY_HEIGHT}` }}
        >
          {/* canvas مرسوم دائماً (لا mount/unmount) — لولا ذلك يفقد
              useEffect أعلاه الوصول لـref لحظة الفتح، ويتحجّم بـCSS فقط
              (opacity)، لا display:none، كي يبقى قابلاً للرسم فوراً. */}
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", opacity: state === "success" ? 1 : 0, transition: "opacity 150ms ease" }}
          />
          {state === "generating" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-muted text-center px-4">
              {t.story.generating}
            </div>
          )}
          {state === "insufficient" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-muted text-center px-4">
              {t.story.insufficientData}
            </div>
          )}
          {state === "error" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-error text-center px-4">
              {t.story.error}
            </div>
          )}
        </div>

        {state === "success" && (
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleDownload}
              className="h-11 rounded-[var(--radius-sm)] bg-primary text-primary-ink font-bold text-sm hover:brightness-110 transition-[filter] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {t.story.download}
            </button>
            {canShareFiles && (
              <button
                type="button"
                onClick={handleShare}
                className="h-11 rounded-[var(--radius-sm)] border border-border font-bold text-sm text-ink hover:border-primary/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {t.story.share}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
