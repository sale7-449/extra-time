import { RssNewsProvider } from "./rss-provider";
import type { NewsProvider } from "./types";
import type { NewsArticle } from "@/lib/types";

/**
 * كل مصادر الأخبار الحقيقية المدعومة حالياً — موجزات RSS رسمية مجانية بلا
 * مفتاح API، مُتحقَّق من كل واحد منها مباشرة (محتوى حالي وقت الفحص، صور
 * حقيقية، تواريخ نشر حقيقية). فشل موجز واحد لا يُسقط الباقي (راجع
 * RssNewsProvider.fetchAll) — فقط فشل الجميع معاً يُرجع الخطأ صراحة، ولا
 * يوجد Mock يُخفي هذا الفشل خلفه إطلاقاً.
 *
 * إنجليزي: BBC وSky Sports وGuardian وESPN وIndependent وMirror — تغطية
 * قوية للانتقالات (Sky خاصة) والدوري الإنجليزي/الأوروبي.
 * عربي: RT Arabic — الموجز الوحيد العربي المخصّص لكرة القدم الذي عُثر عليه
 * حقيقياً وفعلياً حياً بعد فحص Kooora/Yallakora/FilGoal/BBC Arabic/Al
 * Arabiya (لا RSS متاح لديها) وAl Jazeera (RSS عام غير مخصَّص لكرة القدم).
 *
 * `footballOnly: true` على الجميع الآن، لا RT Arabic فقط — تبيّن باختبار
 * حقيقي أن مسارات "/football/" المفترَضة حصرية لدى Sky/BBC/Independent
 * تُسرّب فعلياً تنس/غولف/ملاكمة/كريكيت رغم اسم المسار (راجع
 * classify.ts::isFootballArticle). الاعتماد على اسم/رابط المصدر وحده لم
 * يعد كافياً.
 *
 * لإضافة موجز آخر لاحقاً: أضف {url, source, language} هنا فقط — لا تعديل
 * في UI أو services/news.service.ts.
 */
const rss = new RssNewsProvider([
  { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", source: "BBC Sport", language: "en", footballOnly: true },
  { url: "https://www.skysports.com/rss/12040", source: "Sky Sports", language: "en", footballOnly: true },
  { url: "https://www.theguardian.com/football/rss", source: "The Guardian", language: "en", footballOnly: true },
  { url: "https://www.espn.com/espn/rss/soccer/news", source: "ESPN", language: "en", footballOnly: true },
  { url: "https://www.independent.co.uk/sport/football/rss", source: "The Independent", language: "en", footballOnly: true },
  { url: "https://www.mirror.co.uk/sport/football/?service=rss", source: "The Mirror", language: "en", footballOnly: true },
  { url: "https://arabic.rt.com/rss/sport/", source: "RT Arabic", language: "ar", footballOnly: true },
]);

export const newsProvider: NewsProvider = {
  getTopStory: (...args) => rss.getTopStory(...args),
  getLatestNews: (...args) => rss.getLatestNews(...args),
};

export const isUsingRealNewsData = true;

export type { NewsProvider, NewsArticle };
