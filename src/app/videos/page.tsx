import { MediaExplorer } from "@/components/media/MediaExplorer";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMediaPool } from "@/lib/services/media.service";
import { officialChannels } from "@/lib/providers/media";
import { safeResolve } from "@/lib/errors";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.videos.pageTitle} — EXTRA TIME` };
}

/**
 * محتوى مرئي حقيقي فقط — من قنوات يوتيوب الرسمية المعتمدة (راجع
 * lib/providers/media). لا Mock إطلاقاً: عند غياب المصدر (VIDEO_PROVIDER_ENABLED
 * =false) أو فشل كل القنوات الحقيقية، تُعرض حالة صريحة مع روابط القنوات الرسمية
 * نفسها (بيانات حقيقية معتمَدة) بدل صفحة فارغة أو محتوى مُختلَق.
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
        <EmptyState
          title={t.videos.videosUnavailable}
          description={t.videos.videosUnavailableDesc}
          action={
            officialChannels.length > 0 ? (
              <div className="mt-2 flex flex-col items-center gap-3">
                <p className="text-xs font-bold text-muted-dim">{t.videos.officialChannelsHint}</p>
                <ul className="flex flex-wrap justify-center gap-2">
                  {officialChannels.map((channel) => (
                    <li key={channel.url}>
                      <a
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 items-center rounded-full border border-border bg-surface px-4 text-sm font-bold hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {channel.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : undefined
          }
        />
      ) : (
        <MediaExplorer items={items} />
      )}
    </div>
  );
}
