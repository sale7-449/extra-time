"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { fetchAdminContent, type AdminContentResult } from "@/lib/actions/admin-content.actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SnapchatCreativeKitButton } from "@/components/story/SnapchatCreativeKitButton";
import { StoryTrigger } from "@/components/story/StoryTrigger";
import { isAllowedImageHost } from "@/lib/image-hosts";
import type { ContentItem } from "@/lib/providers/social/types";

/**
 * أداة إدارية بسيطة: رابط خبر/فيديو حقيقي حالي (من RSS/قنوات يوتيوب
 * المُهيَّأة أصلاً بالفعل — لا مصدر جديد، لا scraping) → ContentItem حقيقي
 * → نشر عبر آليات Snapchat الموجودة أصلاً (Creative Kit لصفحة خبر حقيقية،
 * أو صورة Story لفيديو لا صفحة مستقلة له بعد). لا اتصال مباشر بالرابط
 * المُدخَل نفسه إطلاقاً — فقط بحث ضمن المجمّعات الحقيقية المُخزَّنة مؤقتاً.
 */
export default function AdminContentPage() {
  const { t } = useLocale();
  const [newsUrl, setNewsUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminContentResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newsUrl.trim() && !videoUrl.trim()) {
      setError(t.admin.emptyInputError);
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetchAdminContent({ newsUrl, videoUrl, captionOverride: caption });
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page py-6 md:py-10 max-w-2xl">
      <h1 className="text-2xl font-extrabold mb-1">{t.admin.pageTitle}</h1>
      <p className="text-sm text-muted mb-8">{t.admin.pageSubtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="news-url" className="block text-sm font-bold mb-1.5">
            {t.admin.newsUrlLabel}
          </label>
          <Input
            id="news-url"
            type="url"
            dir="ltr"
            value={newsUrl}
            onChange={(e) => setNewsUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <label htmlFor="video-url" className="block text-sm font-bold mb-1.5">
            {t.admin.videoUrlLabel}
          </label>
          <Input
            id="video-url"
            type="url"
            dir="ltr"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div>
          <label htmlFor="caption" className="block text-sm font-bold mb-1.5">
            {t.admin.captionLabel}
          </label>
          <Input id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <p className="text-xs text-muted-dim mt-1">{t.admin.captionHint}</p>
        </div>

        {error && <p className="text-sm text-error font-bold">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? t.admin.submitting : t.admin.submit}
        </Button>
      </form>

      {result && (
        <div className="mt-10 space-y-8">
          <h2 className="text-lg font-extrabold">{t.admin.resultsTitle}</h2>

          {newsUrl.trim() && (
            <ContentResultCard
              label={t.admin.newsResultTitle}
              item={result.news?.item ?? null}
              notFound={result.newsNotFound}
              notFoundMessage={t.admin.newsNotFound}
            >
              {result.news && (
                <div className="mt-4">
                  <p className="text-xs text-muted-dim mb-2">{t.admin.shareSectionTitle}</p>
                  <p className="text-xs text-muted mb-2">{t.admin.shareNewsHint}</p>
                  <SnapchatCreativeKitButton path={result.news.pagePath} />
                </div>
              )}
            </ContentResultCard>
          )}

          {videoUrl.trim() && (
            <ContentResultCard
              label={t.admin.videoResultTitle}
              item={result.video?.item ?? null}
              notFound={result.videoNotFound}
              notFoundMessage={t.admin.videoNotFound}
            >
              {result.video && (
                <div className="mt-4">
                  <p className="text-xs text-muted-dim mb-2">{t.admin.shareSectionTitle}</p>
                  <p className="text-xs text-muted mb-2">{t.admin.shareVideoHint}</p>
                  <StoryTrigger
                    item={result.video.item}
                    label={t.story.snapchat}
                    modalTitle={t.story.newsTitle}
                  />
                </div>
              )}
            </ContentResultCard>
          )}
        </div>
      )}
    </div>
  );
}

function ContentResultCard({
  label,
  item,
  notFound,
  notFoundMessage,
  children,
}: {
  label: string;
  item: ContentItem | null;
  notFound: boolean;
  notFoundMessage: string;
  children?: React.ReactNode;
}) {
  const { t } = useLocale();

  if (notFound) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <p className="text-sm font-extrabold mb-2">{label}</p>
        <p className="text-sm text-error">{notFoundMessage}</p>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <p className="text-sm font-extrabold mb-3">{label}</p>

      <div className="flex gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface-2 flex items-center justify-center">
          {item.imageUrl && isAllowedImageHost(item.imageUrl) ? (
            <Image src={item.imageUrl} alt={item.title} fill sizes="80px" className="object-cover" />
          ) : (
            <span className="text-[10px] text-muted-dim text-center px-1">{t.admin.noImage}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-sm leading-snug">{item.title}</h3>
          {item.summary && <p className="text-xs text-muted mt-1 line-clamp-2">{item.summary}</p>}
          <dl className="mt-2 space-y-0.5 text-xs text-muted-dim">
            {typeof item.data?.source === "string" && (
              <div>
                <dt className="inline font-bold">{t.admin.fieldSource}: </dt>
                <dd className="inline">{item.data.source}</dd>
              </div>
            )}
            {item.sourceUrl && (
              <div className="truncate">
                <dt className="inline font-bold">{t.admin.fieldLink}: </dt>
                <dd className="inline" dir="ltr">
                  {item.sourceUrl}
                </dd>
              </div>
            )}
            {item.language && (
              <div>
                <dt className="inline font-bold">{t.admin.fieldLanguage}: </dt>
                <dd className="inline">{item.language}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {children}
    </div>
  );
}
