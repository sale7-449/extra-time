"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { uploadContentMediaAction } from "@/lib/actions/admin-content.actions";

/**
 * حقل صورة/فيديو مزدوج المصدر — رابط خارجي (نص يدوي كما كان دائماً) أو رفع
 * ملف حقيقي من الجهاز (Supabase Storage، bucket content-media). الرفع لا
 * يُلغي الرابط اليدوي إطلاقاً — كلاهما يكتب لنفس الحقل النصّي في النهاية
 * (رابط عام حقيقي بعد نجاح الرفع)، فبقية الأنابيب (base_content/overrides/
 * resolveContentItem) لا تحتاج أي تمييز بين المصدرين.
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
      {previewSrc &&
        (kind === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element -- معاينة إدارية محلية فقط (قد تكون blob:) — next/image لا يدعم مضيفاً محلياً مؤقتاً كهذا.
          <img src={previewSrc} alt="" className="mt-2 h-28 w-auto rounded-[var(--radius-sm)] border border-border object-cover" />
        ) : (
          <video src={previewSrc} controls className="mt-2 h-28 w-auto rounded-[var(--radius-sm)] border border-border" />
        ))}
    </div>
  );
}
