import type { MediaItem } from "@/lib/types";
import { classifyMedia, detectLanguage, type ChannelKind } from "./classify";

export class YouTubeSearchError extends Error {}

export interface YouTubeSearchOptions {
  /** يقيّد البحث لقناة واحدة معروفة (رسمية) — يرفع الثقة عند التمرير. */
  channelId?: string;
  publishedAfter?: string; // ISO
  publishedBefore?: string; // ISO
  channelKind?: ChannelKind;
  relatedName?: string;
  /** true فقط عند تقييد البحث بـchannelId معروف رسمي لدينا مسبقاً. */
  isOfficialSource?: boolean;
}

interface YouTubeSearchApiItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
  };
}

/**
 * محوّل اختياري — YouTube Data API v3 (search.list) — لتغطية مباريات أقدم
 * لم تعد ضمن آخر ~15 فيديو يعيدها موجز Atom لكل قناة (قيد معروف، راجع
 * youtube-feed-provider.ts). يُفعَّل فقط عند توفّر YOUTUBE_DATA_API_KEY
 * (راجع index.ts) — لا مفتاح متوفر حالياً في هذه البيئة.
 *
 * غير مربوط بمسار البحث الحيّ (match-media-matcher/media.service) بعد: بناء
 * الاستعلام الأمثل وميزانية الـquota وcaching لكل مباراة تحتاج تصميماً
 * إضافياً، والأهم أن هذا الكود لم يُختبَر فعلياً بمفتاح حقيقي — بنيته مطابقة
 * لتوثيق Google الرسمي (Search: list) لكن يجب التحقق العملي قبل الاعتماد
 * عليه بثقة كاملة. الشكل جاهز للربط بخطوة تالية بسيطة عند توفّر مفتاح.
 */
export class YouTubeSearchProvider {
  constructor(private readonly apiKey: string) {}

  async search(query: string, options: YouTubeSearchOptions = {}): Promise<MediaItem[]> {
    const params = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      order: "relevance",
      maxResults: "10",
      key: this.apiKey,
    });
    if (options.channelId) params.set("channelId", options.channelId);
    if (options.publishedAfter) params.set("publishedAfter", options.publishedAfter);
    if (options.publishedBefore) params.set("publishedBefore", options.publishedBefore);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
        signal: controller.signal,
        next: { revalidate: 21600 }, // 6 ساعات — بحث أغلى من موجز عادي، quota يومية محدودة (10,000 وحدة، وseach.list=100 وحدة/طلب)
      });

      if (!response.ok) throw new YouTubeSearchError(`YouTube Data API search failed: ${response.status}`);

      const data = (await response.json()) as { items?: YouTubeSearchApiItem[] };
      const items = Array.isArray(data.items) ? data.items : [];

      return items
        .map((it): MediaItem | null => {
          const videoId = it.id?.videoId;
          const snippet = it.snippet;
          if (!videoId || !snippet) return null;

          const title = snippet.title ?? "";
          const description = snippet.description ?? "";
          const thumbnailUrl = snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? null;

          return {
            id: `yt-${videoId}`,
            title,
            description: description || undefined,
            thumbnailUrl,
            source: snippet.channelTitle ?? "YouTube",
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            publishedAt: snippet.publishedAt ?? new Date().toISOString(),
            language: detectLanguage(`${title} ${description}`),
            category: classifyMedia(title, description, options.channelKind ?? "CLUB"),
            relatedName: options.relatedName,
            isOfficialSource: options.isOfficialSource ?? false,
            isEmbeddable: true,
          } satisfies MediaItem;
        })
        .filter((item): item is MediaItem => item !== null);
    } finally {
      clearTimeout(timeout);
    }
  }
}
