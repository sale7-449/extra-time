import type { NewsArticle } from "@/lib/types";

export interface NewsProvider {
  getTopStory(): Promise<NewsArticle | null>;
  getLatestNews(limit: number): Promise<NewsArticle[]>;
}
