import type { NewsProvider } from "./types";
import type { NewsArticle } from "@/lib/types";
import { parseRssItems } from "./rss-parser";
import { classifyArticle, findTransferType, isFootballArticle } from "./classify";

export class RssFeedError extends Error {}

/** بعض المصادر (Sky Sports) تُصدر pubDate بمنطقة زمنية نصية لا يتعرّف
 * عليها محرّك JS القياسي (BST) فيفشل new Date() بصمت — ما كان يُسقط الموجز
 * كاملاً بدل عنصر واحد فقط (راجع RssFeedError في fetchAll). تحويل صريح
 * لأشهر اختصارات المملكة المتحدة إلى إزاحة UTC رقمية قبل التحليل. */
function parsePubDate(raw: string): string {
  const normalized = raw.replace(/\bBST\b$/, "+0100").replace(/\bGMT\b$/, "+0000");
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export interface NewsFeedConfig {
  url: string;
  source: string;
  language: "ar" | "en";
  /** فعّل فقط لموجزات "رياضة عامة" غير مخصَّصة لكرة القدم حصراً — يُسقط أي
   * عنصر لا يحمل إشارة كرة قدم معروفة بدل عرضه كأنه خبر كرة قدم. */
  footballOnly?: boolean;
}

/**
 * مصدر أخبار حقيقي عبر RSS — لا يخترع شيئاً، كل حقل (عنوان/صورة/تاريخ/مصدر/
 * رابط) يأتي من موجز RSS فعلي. يتقبّل عدة موجزات بلغات مختلفة (كل موجز
 * = {url, source, language}), فتبديل/إضافة مصدر لاحقاً لا يتطلب تعديل
 * الواجهة إطلاقاً.
 */
export class RssNewsProvider implements NewsProvider {
  constructor(private readonly feeds: NewsFeedConfig[]) {}

  private async fetchFeed(feed: NewsFeedConfig): Promise<NewsArticle[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(feed.url, {
        signal: controller.signal,
        next: { revalidate: 900 }, // 15 دقيقة — أخبار حقيقية لكن بلا استهلاك مفرط للمصدر
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ExtraTimeBot/1.0)" },
      });

      if (!response.ok) throw new RssFeedError(`RSS fetch failed: ${response.status} — ${feed.url}`);

      const xml = await response.text();
      const items = parseRssItems(xml);

      return items
        .filter((item) => !feed.footballOnly || isFootballArticle(item.title, item.description))
        .map((item, i) => {
          const { category, relatedName, competitionId } = classifyArticle(item.title, item.description);
          const transferType = category === "TRANSFERS" ? findTransferType(item.title, item.description) : undefined;
          return {
            id: `${feed.source}-${item.link}`.slice(0, 200) || `${feed.source}-${i}`,
            title: item.title,
            summary: item.description,
            imageUrl: item.thumbnailUrl,
            source: feed.source,
            sourceUrl: item.link,
            publishedAt: item.pubDate ? parsePubDate(item.pubDate) : new Date().toISOString(),
            category,
            relatedName,
            language: feed.language,
            competitionId,
            transferType,
          };
        });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchAll(): Promise<NewsArticle[]> {
    const settled = await Promise.allSettled(this.feeds.map((feed) => this.fetchFeed(feed)));
    const articles: NewsArticle[] = [];

    for (const result of settled) {
      if (result.status === "fulfilled") articles.push(...result.value);
      else console.error("[news-rss] a feed failed:", result.reason);
    }

    if (articles.length === 0) throw new RssFeedError("All RSS feeds failed or returned no items");

    // الأولوية للأخبار المرتبطة ببطولات/أندية معروفة ضمن منصتنا، ثم الأحدث.
    return articles.sort((a, b) => {
      const priority = Number(Boolean(b.relatedName)) - Number(Boolean(a.relatedName));
      if (priority !== 0) return priority;
      return +new Date(b.publishedAt) - +new Date(a.publishedAt);
    });
  }

  async getTopStory(): Promise<NewsArticle | null> {
    const articles = await this.fetchAll();
    return articles[0] ?? null;
  }

  async getLatestNews(limit: number): Promise<NewsArticle[]> {
    const articles = await this.fetchAll();
    return articles.slice(0, limit);
  }
}
