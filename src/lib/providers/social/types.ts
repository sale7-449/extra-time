/**
 * تجهيز معماري فقط (المرحلة 2) — عقد بلا تنفيذ، لا ربط حسابات، لا نشر
 * تلقائي الآن. يوحّد أي محتوى حقيقي من الموقع (خبر/نتيجة/هدف/مقطع فيديو)
 * في شكل واحد قابل لاحقاً لتوليد صيغة خاصة بكل منصة تواصل.
 *
 * التدفّق المستهدف مستقبلاً:
 *   محتوى الموقع (NewsArticle/Match/MediaItem حقيقي — راجع lib/types وlib/providers/media)
 *   → ContentItem موحَّد (هنا)
 *   → SocialContentGenerator لكل منصة (X/YouTube/Snapchat)
 *   → نشر يدوي أو شبه-تلقائي لاحقاً — غير مُنفَّذ بعد.
 *
 * لا تُنشئ أي صنف يُنفّذ SocialContentGenerator قبل ربط منصة حقيقية فعلياً.
 */

export type ContentItemKind = "NEWS" | "MATCH_RESULT" | "GOAL" | "TRANSFER" | "VIDEO";

export interface ContentItem {
  id: string;
  kind: ContentItemKind;
  title: string;
  summary?: string;
  imageUrl?: string | null;
  sourceUrl?: string;
  publishedAt: string;
  language?: "ar" | "en";
  /** بيانات خاصة بالنوع (مثلاً {homeTeam, awayTeam, score} لنتيجة مباراة) —
   * كل حقل هنا من بيانات حقيقية فعلية فقط، لا اختلاق. */
  data?: Record<string, unknown>;
}

export type SocialPlatform = "X" | "YOUTUBE" | "SNAPCHAT";

export interface SocialContentGenerator {
  platform: SocialPlatform;
  /** هل هذا العنصر مناسب لهذه المنصة أصلاً (مثال: فيديو فقط لـYouTube)؟ */
  supports(item: ContentItem): boolean;
  /** تحويل العنصر لصيغة جاهزة للمنصة — نص/صورة/فيديو حسب ما تدعمه. توليد
   * محتوى للمراجعة فقط، لا نشر مباشر من هنا. */
  generate(item: ContentItem): Promise<{ text?: string; imageUrl?: string; videoUrl?: string }>;
}
