import type { MediaProvider } from "./types";
import type { MediaItem } from "@/lib/types";
import { parseYouTubeFeed } from "./youtube-feed-parser";
import { classifyMedia, detectLanguage, type ChannelKind } from "./classify";

export class YouTubeFeedError extends Error {}

export interface YouTubeChannelConfig {
  channelId: string;
  source: string;
  kind: ChannelKind;
  /** اسم النادي/البطولة المعروف — من هوية القناة الرسمية نفسها، لا تخمين. */
  relatedName?: string;
}

/**
 * فيديوهات حقيقية من قنوات يوتيوب الرسمية عبر موجز Atom العام
 * (youtube.com/feeds/videos.xml) — بلا مفتاح API، بلا scraping (نقطة نهاية
 * موثَّقة يوفّرها يوتيوب نفسه لهذا الغرض تحديداً)، بلا تنزيل أو استضافة
 * ذاتية للفيديو — فقط metadata حقيقية + رابط تضمين رسمي (embed iframe).
 */
export class YouTubeFeedProvider implements MediaProvider {
  constructor(private readonly channels: YouTubeChannelConfig[]) {}

  private async fetchChannel(channel: YouTubeChannelConfig): Promise<MediaItem[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
      const response = await fetch(url, {
        signal: controller.signal,
        next: { revalidate: 3600 }, // ساعة — فيديوهات لا تتغيّر بوتيرة الأخبار
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ExtraTimeBot/1.0)" },
      });

      if (!response.ok) {
        throw new YouTubeFeedError(`YouTube feed fetch failed: ${response.status} — ${channel.channelId}`);
      }

      const xml = await response.text();
      const entries = parseYouTubeFeed(xml);

      return entries.map((entry) => {
        const category = classifyMedia(entry.title, entry.description, channel.kind);
        const language = detectLanguage(`${entry.title} ${entry.description}`);
        return {
          id: `yt-${entry.videoId}`,
          title: entry.title,
          description: entry.description || undefined,
          thumbnailUrl: entry.thumbnailUrl,
          source: channel.source,
          sourceUrl: entry.watchUrl,
          embedUrl: `https://www.youtube.com/embed/${entry.videoId}`,
          publishedAt: entry.publishedAt ?? new Date().toISOString(),
          language,
          category,
          relatedName: channel.relatedName,
          // قنوات رسمية للأندية/البطولات تسمح بالتضمين افتراضياً؛ إن مُنع
          // لاحقاً لفيديو بعينه يعرض iframe يوتيوب نفسه بديلاً داخلياً بلا
          // كسر الصفحة — لا حاجة لتأكيد مسبق غير متاح بلا Data API.
          isEmbeddable: true,
          // كل قنوات هذا المزوّد معتمَدة يدوياً (راجع index.ts) — إشارة ثقة
          // حقيقية لـmatch-media-matcher، لا افتراض عشوائي.
          isOfficialSource: true,
        } satisfies MediaItem;
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async getLatestMedia(limit: number): Promise<MediaItem[]> {
    const settled = await Promise.allSettled(this.channels.map((c) => this.fetchChannel(c)));
    const items: MediaItem[] = [];

    for (const result of settled) {
      if (result.status === "fulfilled") items.push(...result.value);
      else console.error("[media-youtube] a channel feed failed:", result.reason);
    }

    if (items.length === 0) throw new YouTubeFeedError("All YouTube channel feeds failed or returned no items");

    return items.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)).slice(0, limit);
  }
}
