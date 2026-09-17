"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fetchAdminContent, type AdminContentResult } from "@/lib/actions/admin-content.actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StoryTrigger } from "@/components/story/StoryTrigger";
import { isAllowedImageHost } from "@/lib/image-hosts";

/**
 * أداة مستقلة عن Content Studio (Drafts) — بلا حفظ، بلا وجهة، بلا نشر: رابط
 * فيديو حقيقي من قناة مُهيَّأة أصلاً → ContentItem → صورة Story (Preview +
 * تنزيل/مشاركة يدوية عبر StoryModal). موجودة قبل Content Studio ولم تُغيَّر.
 */
export function VideoQuickShare() {
  const { t } = useLocale();
  const [videoUrl, setVideoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminContentResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setError(t.admin.emptyInputError);
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetchAdminContent({ videoUrl, captionOverride: caption });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-1">{t.admin.videoShareTitle}</h2>
      <p className="text-sm text-muted mb-6">{t.admin.videoShareSubtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="video-url" className="block text-sm font-bold mb-1.5">
            {t.admin.videoUrlLabel}
          </label>
          <Input id="video-url" type="url" dir="ltr" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        </div>
        <div>
          <label htmlFor="video-caption" className="block text-sm font-bold mb-1.5">
            {t.admin.captionLabel}
          </label>
          <Input id="video-caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <p className="text-xs text-muted-dim mt-1">{t.admin.captionHint}</p>
        </div>

        {error && <p className="text-sm text-error font-bold">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? t.admin.submitting : t.admin.submit}
        </Button>
      </form>

      {result && (
        <div className="mt-6 max-w-lg">
          {result.videoNotFound ? (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
              <p className="text-sm font-extrabold mb-2">{t.admin.videoResultTitle}</p>
              <p className="text-sm text-error">{t.admin.videoNotFound}</p>
            </div>
          ) : result.video ? (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
              <p className="text-sm font-extrabold mb-3">{t.admin.videoResultTitle}</p>
              <div className="flex gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface-2 flex items-center justify-center">
                  {result.video.item.imageUrl && isAllowedImageHost(result.video.item.imageUrl) ? (
                    <Image src={result.video.item.imageUrl} alt={result.video.item.title} fill sizes="80px" className="object-cover" />
                  ) : (
                    <span className="text-[10px] text-muted-dim text-center px-1">{t.admin.noImage}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-sm leading-snug">{result.video.item.title}</h3>
                  {result.video.item.summary && <p className="text-xs text-muted mt-1 line-clamp-2">{result.video.item.summary}</p>}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-muted mb-2">{t.admin.shareVideoHint}</p>
                <StoryTrigger item={result.video.item} label={t.story.snapchat} modalTitle={t.story.newsTitle} />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
