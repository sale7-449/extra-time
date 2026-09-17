import { newsProvider } from "@/lib/providers/news";
import type { NewsArticle } from "@/lib/types";
import type { Locale } from "@/lib/i18n/messages";
import { listPublishedSiteNewsDrafts } from "@/lib/admin/content-drafts";
import { resolveContentItem } from "@/lib/providers/social/content-builders";

const NEWS_CATEGORIES = new Set<NewsArticle["category"]>([
  "SAUDI_LEAGUE", "PREMIER_LEAGUE", "LA_LIGA", "BUNDESLIGA", "SERIE_A",
  "LIGUE_1", "CHAMPIONS_LEAGUE", "INTERNATIONAL", "TRANSFERS", "FOOTBALL",
]);

/** خبر منشور من Content Studio (Admin) → NewsArticle حقيقي بنفس شكل خبر
 * RSS تماماً، ليدخل نفس مسار الدمج/الفرز/الإزالة أدناه بلا أي مسار موازٍ. */
function draftToNewsArticle(draftId: string, item: ReturnType<typeof resolveContentItem>): NewsArticle | null {
  if (item.kind !== "NEWS" || !item.title.trim()) return null;

  const category = typeof item.data?.category === "string" && NEWS_CATEGORIES.has(item.data.category as NewsArticle["category"])
    ? (item.data.category as NewsArticle["category"])
    : "FOOTBALL";

  return {
    id: `admin-${draftId}`,
    title: item.title,
    summary: item.summary ?? "",
    imageUrl: item.imageUrl ?? null,
    source: typeof item.data?.source === "string" ? item.data.source : "Extra Time",
    sourceUrl: item.sourceUrl ?? `/news/admin-${draftId}`,
    publishedAt: item.publishedAt,
    category,
    relatedName: typeof item.data?.relatedName === "string" ? item.data.relatedName : undefined,
    language: item.language,
  };
}

/** الأخبار المنشورة فعلياً من Content Studio لوجهة الموقع — [] بصمت عند أي
 * فشل قراءة (لا تكسر RSS الحالي إطلاقاً بسبب مشكلة في مصدر إداري منفصل). */
async function getPublishedAdminNews(): Promise<NewsArticle[]> {
  const drafts = await listPublishedSiteNewsDrafts();
  const articles: NewsArticle[] = [];
  for (const draft of drafts) {
    const item = resolveContentItem(draft.baseContent, draft.overrides);
    const article = draftToNewsArticle(draft.id, item);
    if (article) articles.push(article);
  }
  return articles;
}

// حجم تجمّع كبير عمداً: RssNewsProvider يجلب كل الموجزات المُهيَّأة دائماً
// بغضّ النظر عن الرقم المطلوب (التقطيع فقط هو ما يتغيّر)، فرفعه هنا لا
// يستهلك أي مصدر إضافياً — لكنه ضروري كي لا يُقصي فرزُ المزوّد الداخلي
// (بحسب الفريق/البطولة ثم الأحدث، بلا وعي باللغة) موجزاً كاملاً كـRT
// Arabic أو Sky Sports قبل أن تصل خطوة الترتيب حسب لغة الواجهة هنا أصلاً.
const POOL_SIZE = 200;

/**
 * يُقدَّم المحتوى بلغة الواجهة أولاً، ثم الأخبار المرتبطة بفريق/بطولة
 * معروفة، ثم الأحدث زمنياً. لا إسقاط لأي خبر من اللغة الأخرى — فقط ترتيبه
 * لاحقاً، كي لا تظهر الواجهة فارغة إن كانت أخبار لغتها المفضّلة قليلة حالياً
 * (بدل اختلاق ترجمة، تُعرض المقالة بلغتها الأصلية).
 */
function sortForLocale(articles: NewsArticle[], locale: Locale): NewsArticle[] {
  return [...articles].sort((a, b) => {
    const languageScore = (article: NewsArticle) => (article.language === locale ? 0 : 1);
    const langDiff = languageScore(a) - languageScore(b);
    if (langDiff !== 0) return langDiff;

    const relatedDiff = Number(Boolean(b.relatedName)) - Number(Boolean(a.relatedName));
    if (relatedDiff !== 0) return relatedDiff;

    return +new Date(b.publishedAt) - +new Date(a.publishedAt);
  });
}

const STOP_WORDS = new Set([
  "the", "a", "an", "to", "in", "on", "of", "for", "and", "with", "from", "by", "at", "as", "is", "are", "will", "after", "over",
  "في", "من", "إلى", "على", "مع", "عن", "أن", "إن", "هو", "هي", "بعد", "قبل", "مع", "هذا", "هذه",
]);

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

/** رابط مطبَّع لمقارنة "هل هذا نفس المقال فعلياً؟" — يحذف معاملات التتبّع
 * الشائعة فقط (RSS المصادر تُلحقها دائماً بنفس الرابط الأساسي)، لا يخمّن
 * تطابقاً لروابط مختلفة فعلياً. */
function normalizeSourceUrl(url: string): string {
  try {
    const u = new URL(url);
    ["at_medium", "at_campaign", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "cmp", "CMP", "ns_mchannel", "ns_source", "ns_campaign"].forEach(
      (p) => u.searchParams.delete(p)
    );
    u.hash = "";
    return `${u.hostname}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** أعلى نقاطاً = بيانات أوثق (صورة حقيقية + تصنيف أدق) — تُستخدم فقط لاختيار
 * أيّ نسخة نُبقي عند اكتشاف تكرار، لا لترتيب العرض العام. */
function articleQualityScore(article: NewsArticle): number {
  let score = 0;
  if (article.imageUrl) score += 2;
  if (article.relatedName) score += 1;
  if (article.competitionId) score += 1;
  if (article.transferType) score += 1;
  return score;
}

function pickBetter(a: NewsArticle, b: NewsArticle): NewsArticle {
  const scoreDiff = articleQualityScore(b) - articleQualityScore(a);
  if (scoreDiff !== 0) return scoreDiff > 0 ? b : a;
  return +new Date(b.publishedAt) > +new Date(a.publishedAt) ? b : a;
}

/**
 * دمج التكرار على مرحلتين — لا تحذف المقال، بل تُبقي أفضل نسخة منه:
 * 1) رابط مصدر مطابق (بعد تطبيع معاملات التتبّع) = نفس المقال يقيناً.
 * 2) بصمة كلمات العنوان شبه متطابقة (≥60% تداخل) لنفس اللغة ضمن ٦ ساعات
 *    = نفس الحدث بعناوين مختلفة من ناشرين مختلفين.
 * "الأفضل" = صورة حقيقية أولاً، ثم بيانات تصنيف أدق، ثم الأحدث نشراً.
 */
function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
  const byUrl = new Map<string, NewsArticle>();
  for (const article of articles) {
    const key = normalizeSourceUrl(article.sourceUrl);
    const existing = byUrl.get(key);
    byUrl.set(key, existing ? pickBetter(existing, article) : article);
  }

  const kept: NewsArticle[] = [];
  const keptWords: Set<string>[] = [];

  for (const article of byUrl.values()) {
    const words = titleWords(article.title);
    let duplicateIndex = -1;

    for (let i = 0; i < kept.length; i++) {
      if (kept[i].language !== article.language || words.size === 0 || keptWords[i].size === 0) continue;
      const hoursApart = Math.abs(+new Date(kept[i].publishedAt) - +new Date(article.publishedAt)) / 3_600_000;
      if (hoursApart > 6) continue;
      let overlap = 0;
      for (const w of words) if (keptWords[i].has(w)) overlap++;
      if (overlap / Math.min(words.size, keptWords[i].size) >= 0.6) {
        duplicateIndex = i;
        break;
      }
    }

    if (duplicateIndex === -1) {
      kept.push(article);
      keptWords.push(words);
    } else {
      kept[duplicateIndex] = pickBetter(kept[duplicateIndex], article);
    }
  }

  return kept;
}

/** المصدر الخام الموحَّد لكل دوال هذا الملف: موجزات RSS الحقيقية + أخبار
 * Content Studio المنشورة فعلياً لوجهة الموقع (Admin) — كلاهما NewsArticle
 * حقيقي بنفس الشكل تماماً، فيدخلان معاً نفس مسار dedupe/sort أدناه بلا أي
 * معاملة خاصة. فشل قراءة أخبار Admin لا يكسر RSS إطلاقاً (راجع getPublishedAdminNews). */
async function getRawPool(): Promise<NewsArticle[]> {
  const [rss, admin] = await Promise.all([newsProvider.getLatestNews(POOL_SIZE), getPublishedAdminNews()]);
  return [...admin, ...rss];
}

export async function getTopStory(locale: Locale = "ar"): Promise<NewsArticle | null> {
  const pool = await getRawPool();
  return dedupeArticles(sortForLocale(pool, locale))[0] ?? null;
}

export async function getLatestNews(limit = 6, locale: Locale = "ar"): Promise<NewsArticle[]> {
  const pool = await getRawPool();
  return dedupeArticles(sortForLocale(pool, locale)).slice(0, limit);
}

/** المجمّع الكامل مُرتَّباً ومُدمجاً — للصفحات التي تحتاج تصنيفه/تصفيته
 * بنفسها (البحث، الأقسام، صفحة الانتقالات، صفحة خبر مفرد) بدل تكرار نفس
 * منطق sortForLocale/dedupeArticles في كل مكان. لا طلب شبكة إضافي —
 * newsProvider.getLatestNews يعتمد على تخزين RSS المؤقت نفسه دائماً. */
export async function getNewsPool(locale: Locale = "ar"): Promise<NewsArticle[]> {
  const pool = await getRawPool();
  return dedupeArticles(sortForLocale(pool, locale));
}

export async function getNewsByCategory(
  category: NewsArticle["category"],
  locale: Locale = "ar",
  limit = 6
): Promise<NewsArticle[]> {
  const pool = await getNewsPool(locale);
  return pool.filter((a) => a.category === category).slice(0, limit);
}

/** يبحث عن مقالة بعينها ضمن المجمّع الحالي — الأخبار لا تُخزَّن بمعرّف ثابت
 * دائم (RSS متجدّد)، فمقالة قديمة جداً قد تخرج من نافذة التخزين المؤقت
 * وتُعامَل بصدق كـ"غير موجودة" (404) بدل اختلاقها. */
export async function getNewsById(id: string, locale: Locale = "ar"): Promise<NewsArticle | null> {
  const pool = await getNewsPool(locale);
  return pool.find((a) => a.id === id) ?? null;
}

/**
 * تُستخدم لقسم "أحدث الأخبار"/"آخر الأخبار" تحديداً — بعد استبعاد ما ظهر
 * فعلاً في أقسام مصنَّفة أعلاه بالفعل (excludeIds)، مع حد عمر واضح (7 أيام
 * افتراضياً) بدل عرض أخبار عمرها أشهر كأنها "أحدث الأخبار"، وحد عددي معقول.
 * لا تُعوَّض الأخبار الناقصة بأقدم منها — القسم يصغر بصدق بدل التمدد بمحتوى
 * قديم غير ذي صلة.
 */
export function selectLatestNews(
  pool: NewsArticle[],
  excludeIds: Set<string>,
  { maxAgeDays = 7, limit = 12 }: { maxAgeDays?: number; limit?: number } = {}
): NewsArticle[] {
  const cutoff = Date.now() - maxAgeDays * 86_400_000;
  return pool.filter((a) => !excludeIds.has(a.id) && +new Date(a.publishedAt) >= cutoff).slice(0, limit);
}
