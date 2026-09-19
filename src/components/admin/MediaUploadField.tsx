"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createContentMediaUploadAction } from "@/lib/actions/admin-content.actions";
import { createClient } from "@/lib/supabase/client";
import { detectPreviewKind, extractYouTubeVideoId } from "@/lib/media-kind";

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
      // 1) تذكرة رفع صغيرة من الخادم (صلاحية + نوع + حجم)، 2) رفع الملف نفسه مباشرة
      // من المتصفح إلى Storage — لا جسم كبير عبر Server Action (كان يفشل صامتاً >1MB).
      const ticket = await createContentMediaUploadAction({
        folder,
        kind,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
      if ("error" in ticket) {
        setError(
          ticket.error === "too_large"
            ? t.admin.uploadTooLarge
            : ticket.error === "invalid_type"
              ? t.admin.uploadInvalidType
              : t.admin.uploadFailed
        );
        return;
      }

      const supabase = createClient();
      if (!supabase) return setError(t.admin.uploadFailed);
      const { error: uploadError } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploadError) return setError(t.admin.uploadFailed);

      onChange(ticket.url);
    } catch {
      // أي فشل (شبكة، خطأ خادم) يجب أن يظهر للمستخدم — لا صمت.
      setError(t.admin.uploadFailed);
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
        <video src={previewSrc} controls playsInline preload="metadata" className="mt-2 h-28 w-auto rounded-[var(--radius-sm)] border border-border" />
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
