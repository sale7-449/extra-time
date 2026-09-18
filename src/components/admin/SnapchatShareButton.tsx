"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { generateStoryImage, STORY_WIDTH, STORY_HEIGHT } from "@/lib/story";
import { detectPreviewKind } from "@/components/admin/MediaUploadField";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/icons";
import type { ContentItem } from "@/lib/providers/social/types";

type GenerationState = "generating" | "success" | "insufficient" | "error";

/**
 * زر مشاركة Snapchat الاحتياطي داخل Content Studio فقط — منفصل تماماً عن
 * StoryModal/StoryTrigger المُستخدَمين في الموقع العام (news/matches)، كي
 * لا يتأثّرا بهذا التغيير. يُعيد استخدام buildStoryLayout/renderStoryCanvas
 * كما هما تماماً للمعاينة المرئية — الجديد هنا فقط منطق "ماذا نُرفِق فعلياً
 * عند المشاركة": صورة Story دائماً، إلا إذا كان المحتوى VIDEO بفيديو حقيقي
 * قابل للجلب (رفع من الجهاز أو رابط ملف مباشر، لا يوتيوب/Vimeo) فيُرفَق
 * الفيديو نفسه. لا نشر تلقائي من الخادم لأي حساب إطلاقاً — Web Share API
 * فقط، يفتح تطبيق Snapchat الحقيقي على جهاز المستخدم إن كان مثبَّتاً ضمن
 * قائمة المشاركة، تماماً كأي تطبيق مشاركة نظام آخر.
 */
export function SnapchatShareButton({ item }: { item: ContentItem | null }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  if (!item) return null;

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {t.admin.shareToSnapchat}
      </Button>
      {open && <SnapchatShareModal item={item} onClose={() => setOpen(false)} />}
    </>
  );
}

function SnapchatShareModal({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const { t, locale } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<GenerationState>("generating");
  const [sharing, setSharing] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function"
  );

  const videoUrl = typeof item.data?.embedUrl === "string" ? item.data.embedUrl : null;
  const hasDirectVideo = item.kind === "VIDEO" && Boolean(videoUrl) && detectPreviewKind(videoUrl ?? "", "VIDEO") === "VIDEO_FILE";

  useEffect(() => {
    if (!canvasRef.current) return;
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
  }, [item, locale]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function getImageBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  /** الملف الفعلي الذي سيُشارَك/يُنزَّل — فيديو حقيقي قابل للجلب إن توفّر
   * لمحتوى VIDEO، وإلا صورة الـStory المُصمَّمة دائماً. لا رابط صفحة موقع
   * أبداً في أي من الحالتين. */
  async function buildShareFile(): Promise<File | null> {
    if (hasDirectVideo && videoUrl) {
      try {
        const response = await fetch(videoUrl);
        if (response.ok) {
          const blob = await response.blob();
          return new File([blob], "extra-time-clip.mp4", { type: blob.type || "video/mp4" });
        }
      } catch {
        // تعذّر جلب الفيديو فعلياً (مثلاً رابط خارجي بلا CORS مناسب) —
        // نتراجع بصمت لصورة الـStory أدناه بدل فشل المشاركة كاملة.
      }
    }
    const imageBlob = await getImageBlob();
    if (!imageBlob) return null;
    return new File([imageBlob], "extra-time-story.png", { type: "image/png" });
  }

  async function handleDownload() {
    const file = await buildShareFile();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    setSharing(true);
    try {
      const file = await buildShareFile();
      if (!file) return;
      if (!navigator.canShare?.({ files: [file] })) {
        setCanShareFiles(false);
        return;
      }
      try {
        await navigator.share({ files: [file], title: item.title, text: item.title });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return; // المستخدم أغلق نافذة المشاركة بنفسه
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.admin.shareToSnapchat}
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

        <h3 className="text-sm font-extrabold mb-1">{t.admin.shareToSnapchat}</h3>
        <p className="text-xs text-muted-dim mb-4">{t.admin.snapchatShareDisclaimer}</p>

        <div
          className="relative mx-auto rounded-[var(--radius-md)] overflow-hidden border border-border bg-surface-2"
          style={{ width: "min(72vw, 260px)", aspectRatio: `${STORY_WIDTH} / ${STORY_HEIGHT}` }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", opacity: state === "success" ? 1 : 0, transition: "opacity 150ms ease" }}
          />
          {state === "generating" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-muted text-center px-4">{t.story.generating}</div>
          )}
          {state === "insufficient" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-muted text-center px-4">{t.story.insufficientData}</div>
          )}
          {state === "error" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-error text-center px-4">{t.story.error}</div>
          )}
        </div>

        {hasDirectVideo && state === "success" && <p className="text-xs text-muted mt-2 text-center">{t.admin.willShareAsVideo}</p>}

        {state === "success" && (
          <div className="mt-5 flex flex-col gap-2.5">
            {canShareFiles ? (
              <button
                type="button"
                onClick={handleShare}
                disabled={sharing}
                className="h-11 rounded-[var(--radius-sm)] bg-primary text-primary-ink font-bold text-sm hover:brightness-110 transition-[filter] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {sharing ? t.admin.sharing : t.admin.shareToSnapchat}
              </button>
            ) : (
              <p className="text-xs text-warning font-bold text-center">{t.admin.shareUnsupportedDevice}</p>
            )}
            <button
              type="button"
              onClick={handleDownload}
              className="h-11 rounded-[var(--radius-sm)] border border-border font-bold text-sm text-ink hover:border-primary/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {hasDirectVideo ? t.admin.downloadVideo : t.story.download}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
