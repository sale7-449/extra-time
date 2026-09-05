import { MediaExplorer } from "@/components/media/MediaExplorer";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMediaPool } from "@/lib/services/media.service";
import { safeResolve } from "@/lib/errors";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.videos.pageTitle} — EXTRA TIME` };
}

/**
 * محتوى مرئي حقيقي فقط — من قنوات يوتيوب الرسمية المعتمدة (راجع
 * lib/providers/media). لا Mock إطلاقاً: عند غياب المصدر (VIDEO_PROVIDER_ENABLED
 * =false) أو فشل كل القنوات الحقيقية، تُعرض حالة فارغة صريحة بدل محتوى مُختلَق.
 */
export default async function VideosPage() {
  const locale = await getServerLocale();
  const t = getMessages(locale);
  const items = await safeResolve(getMediaPool(locale), [], "videos-page");

  return (
    <div className="container-page py-8 md:py-10">
      <h1 className="text-2xl font-extrabold mb-2">{t.videos.pageTitle}</h1>
      <p className="text-sm text-muted mb-8 max-w-2xl">{t.videos.pageSubtitle}</p>

      {items.length === 0 ? (
        <EmptyState title={t.videos.videosUnavailable} description={t.videos.videosUnavailableDesc} />
      ) : (
        <MediaExplorer items={items} />
      )}
    </div>
  );
}
