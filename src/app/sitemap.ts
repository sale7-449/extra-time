import type { MetadataRoute } from "next";
import { footballProvider } from "@/lib/providers/football";
import { safeResolve } from "@/lib/errors";

// يُضبَط عبر NEXT_PUBLIC_SITE_URL عند توفّر نطاق فعلي للإنتاج — لا يوجد نطاق
// حقيقي بعد، فالقيمة الافتراضية placeholder صريح بدل ادّعاء نطاق وهمي.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://extratime.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/matches", "/results", "/news", "/competitions", "/stats"].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  // بطولات حقيقية فقط من مزوّد البيانات الفعلي — لا بيانات Mock إطلاقاً هنا
  // (كانت خريطة الموقع تُسرّب معرّفات بطولات ومباريات Mock وهمية كروابط
  // عامة قابلة للفهرسة). فشل المصدر لا يُسقط باقي الخريطة، فقط يحذف قسم
  // البطولات الديناميكي لهذه الدورة. مزوّد البيانات الخام مباشرة (لا طبقة
  // الخدمة المُوطَّنة) عمداً — لا حاجة لاسم مُترجَم هنا، فقط id، وتفادي
  // getServerLocale()/cookies() يُبقي /sitemap.xml قابلاً للتوليد الساكن.
  const competitions = await safeResolve(footballProvider.getCompetitions(), [], "sitemap-competitions");
  const competitionRoutes = competitions.map((c) => ({
    url: `${BASE_URL}/competitions/${c.id}`,
    lastModified: new Date(),
  }));

  // لا مباريات ديناميكية في الخريطة: معرّفاتها الحقيقية تتغيّر يومياً
  // وتنتهي صلاحيتها بسرعة (لا قيمة SEO)، وتعدادها هنا يستهلك حصة API
  // المحدودة بلا داعٍ عند كل طلب لملف الخريطة.
  return [...staticRoutes, ...competitionRoutes];
}
