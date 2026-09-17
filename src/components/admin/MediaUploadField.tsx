"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { uploadContentMediaAction } from "@/lib/actions/admin-content.actions";

/** معرّف فيديو يوتيوب من أي صيغة رابط شائعة — نسخة عميل بسيطة مطابقة لمنطق
 * extractYouTubeId في admin-content.actions.ts (غير قابلة للاستيراد من هناك:
 * ملف "use server" لا يُصدِّر إلا Server Actions غير متزامنة). */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/^\/(shorts|embed)\/([^/?]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

export type PreviewKind = "IMAGE" | "YOUTUBE" | "VIDEO_FILE" | "LINK";

/** يُحدَّد نوع المعاينة من شكل القيمة الفعلية نفسها، لا من "kind" الحقل
 * المُعلَن — رابط يوتيوب داخل حقل "صورة" يجب ألا يُعرَض أبداً داخل <img>،
 * تماماً كالعكس. blob:/data: تأتي حصراً من رفع محلي نتحكّم بنوعه فعلياً،
 * فتُصنَّف حسب kind الحقل مباشرة (موثوقة، لا تخمين). */
export function detectPreviewKind(value: string, fieldKind: "IMAGE" | "VIDEO"): PreviewKind {
  if (value.startsWith("blob:") || value.startsWith("data:")) return fieldKind === "IMAGE" ? "IMAGE" : "VIDEO_FILE";
  if (extractYouTubeVideoId(value)) return "YOUTUBE";
  if (/\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/i.test(value)) return "VIDEO_FILE";
  if (/\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(value)) return "IMAGE";
  // امتداد غير معروف: حقل صورة يبقى صورة افتراضياً (شعارات حقيقية كثيرة في
  // هذا المشروع بلا امتداد ظاهر في الرابط) — لكن حقل فيديو بقيمة غير
  // مؤكَّدة التشغيل يُعرَض كبطاقة رابط، فمشغّل <video> مكسور صامت أسوأ من
  // بطاقة رابط صادقة.
  return fieldKind === "IMAGE" ? "IMAGE" : "LINK";
}

/**
 * حقل صورة/فيديو مزدوج المصدر — رابط خارجي (نص يدوي كما كان دائماً) أو رفع
 * ملف حقيقي من الجهاز (Supabase Storage، bucket content-media). الرفع لا
 * يُلغي الرابط اليدوي إطلاقاً — كلاهما يكتب لنفس الحقل النصّي في النهاية
 * (رابط عام حقيقي بعد نجاح الرفع)، فبقية الأنابيب (base_content/overrides/
 * resolveContentItem) لا تحتاج أي تمييز بين المصدرين. المعاينة نفسها تُميّز
 * فعلياً بين صورة/فيديو يوتيوب/ملف فيديو مباشر/رابط عام غير معروف، بدل
 * افتراض أن كل شيء في حقل "صورة" هو صورة فعلاً.
 */
export function MediaUploadField({
  kind,
  value,
  onChange,
  folder,
  label,
}: {
  kind: "IMAGE" | "VIDEO";
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label: string;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setUploading(true);
    try {
      const result = await uploadContentMediaAction({ folder, kind, file });
      if ("error" in result) {
        setError(
          result.error === "too_large"
            ? t.admin.uploadTooLarge
            : result.error === "invalid_type"
              ? t.admin.uploadInvalidType
              : t.admin.uploadFailed
        );
        return;
      }
      onChange(result.url);
    } finally {
      setUploading(false);
    }
  }

  const previewSrc = localPreview ?? (value.trim() || null);
  const previewKind = previewSrc ? detectPreviewKind(previewSrc, kind) : null;
  const youtubeId = previewKind === "YOUTUBE" && previewSrc ? extractYouTubeVideoId(previewSrc) : null;

  return (
    <div>
      <label className="block text-sm font-bold mb-1.5">{label}</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="url"
          dir="ltr"
          value={value}
          onChange={(e) => {
            setLocalPreview(null);
            onChange(e.target.value);
          }}
          placeholder="https://..."
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading} className="shrink-0">
          {uploading ? t.admin.uploading : kind === "IMAGE" ? t.admin.chooseImage : t.admin.chooseVideo}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={kind === "IMAGE" ? "image/*" : "video/*"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />
      {error && <p className="text-xs text-error font-bold mt-1">{error}</p>}

      {previewSrc && previewKind === "IMAGE" && (
        // eslint-disable-next-line @next/next/no-img-element -- معاينة إدارية محلية/رابط خارجي عشوائي — next/image يتطلّب إدراج المضيف مسبقاً.
        <img src={previewSrc} alt="" className="mt-2 h-28 w-auto rounded-[var(--radius-sm)] border border-border object-cover" />
      )}

      {previewSrc && previewKind === "YOUTUBE" && youtubeId && (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube preview"
          className="mt-2 h-28 w-full max-w-[220px] rounded-[var(--radius-sm)] border border-border"
          allow="encrypted-media"
        />
      )}

      {previewSrc && previewKind === "VIDEO_FILE" && (
        <video src={previewSrc} controls className="mt-2 h-28 w-auto rounded-[var(--radius-sm)] border border-border" />
      )}

      {previewSrc && previewKind === "LINK" && (
        <a
          href={previewSrc}
          target="_blank"
          rel="noopener noreferrer"
          dir="ltr"
          className="mt-2 flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3 py-2 text-xs text-primary truncate max-w-full"
        >
          🔗 {previewSrc}
        </a>
      )}
    </div>
  );
}
