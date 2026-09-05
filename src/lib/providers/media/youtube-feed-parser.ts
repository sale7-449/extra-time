/**
 * محلل خفيف لموجز Atom الخاص بقناة يوتيوب (يوفّره يوتيوب علناً على
 * youtube.com/feeds/videos.xml?channel_id=... بلا مفتاح API) — بنية مختلفة
 * عن RSS 2.0 المستخدَم في lib/providers/news: وسم <entry> بدل <item>،
 * <yt:videoId> منفصل عن رابط المشاهدة، والصورة المصغّرة داخل
 * <media:group><media:thumbnail>. بلا مكتبة خارجية، بنفس نهج
 * news/rss-parser.ts (محلّل مخصَّص لبنية واحدة معروفة، لا محلّل XML عام).
 */
import { decodeEntities } from "@/lib/providers/news/rss-parser";

export interface YouTubeFeedEntry {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  watchUrl: string;
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : null;
}

function extractAttr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : null;
}

export function parseYouTubeFeed(xml: string): YouTubeFeedEntry[] {
  const blocks = xml.split(/<entry>/).slice(1);

  return blocks
    .map((raw) => {
      const block = raw.split(/<\/entry>/)[0];
      const videoId = extractTag(block, "yt:videoId");
      const title = extractTag(block, "title");
      if (!videoId || !title) return null;

      const linkTag = block.match(/<link\b[^>]*rel="alternate"[^>]*\/?>/)?.[0] ?? "";
      const watchUrl = extractAttr(linkTag, "href") ?? `https://www.youtube.com/watch?v=${videoId}`;

      // الوصف والصورة المصغّرة داخل <media:group> تحديداً — البحث في القالب
      // كاملاً بدل هذا قد يلتقط وسوماً بنفس الاسم خارج السياق الصحيح.
      const mediaGroup = block.match(/<media:group>([\s\S]*?)<\/media:group>/)?.[1] ?? block;
      const description = extractTag(mediaGroup, "media:description") ?? "";
      const thumbTag = mediaGroup.match(/<media:thumbnail\b[^>]*\/?>/)?.[0] ?? "";
      const thumbnailUrl = thumbTag ? extractAttr(thumbTag, "url") : null;

      const publishedAt = extractTag(block, "published");

      return {
        videoId,
        title: decodeEntities(title),
        description: decodeEntities(description),
        publishedAt,
        thumbnailUrl,
        watchUrl: decodeEntities(watchUrl),
      };
    })
    .filter((entry): entry is YouTubeFeedEntry => entry !== null);
}
