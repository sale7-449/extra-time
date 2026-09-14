/**
 * كتالوج البطولات المُختارة يدوياً — كل معرّف هنا تحقّقنا منه فعلياً عبر
 * API المصدر نفسه (API-Football /leagues?search=.../?country=...، بموسم
 * "current" حقيقي) قبل إضافته، لا معرّف مُخترَع أو مُخمَّن. إضافة بطولة
 * حقيقية جديدة لاحقاً = سطر واحد هنا بعد نفس التحقّق، بلا حاجة لتعديل أي
 * منطق جلب/فلترة داخل الـProviders أنفسهم (api-football-provider.ts،
 * thesportsdb-provider.ts).
 *
 * `tsdbId` غير موجود لكل بطولة — TheSportsDB لا يوفّر بحثاً حراً موثوقاً
 * على المفتاح المجاني العام المُستخدَم هنا (يُعيد فقط عدداً صغيراً محدوداً
 * من البطولات الأوروبية عبر all_leagues.php)، فمعرّفات TheSportsDB هنا
 * تقتصر على ما تحقّقنا منه يدوياً سابقاً. بطولة بلا tsdbId تبقى مدعومة
 * بالكامل عبر API-Football فقط — لا تُخترَع لها قيمة.
 */

export type CompetitionCategory = "SAUDI" | "AFC" | "GULF" | "INTERNATIONAL";

export interface CatalogEntry {
  category: CompetitionCategory;
  /** أقل رقم = أهم/أعلى أولوية ضمن فئتها. */
  priority: number;
  afId?: number;
  tsdbId?: number;
}

export const COMPETITION_CATALOG: CatalogEntry[] = [
  // السعودية
  { category: "SAUDI", priority: 1, afId: 307, tsdbId: 4668 }, // دوري روشن السعودي
  { category: "SAUDI", priority: 2, afId: 504 }, // كأس الملك
  { category: "SAUDI", priority: 3, afId: 826 }, // كأس السوبر السعودي
  { category: "SAUDI", priority: 4, afId: 308 }, // دوري الدرجة الأولى

  // آسيوية (AFC)
  { category: "AFC", priority: 10, afId: 17 }, // دوري أبطال آسيا للنخبة (AFC Champions League Elite)
  { category: "AFC", priority: 11, afId: 18 }, // دوري أبطال آسيا 2 (AFC Champions League Two)

  // خليجية
  { category: "GULF", priority: 20, afId: 25 }, // كأس الخليج للأمم (خليجي)
  { category: "GULF", priority: 21, afId: 1162 }, // بطولة الخليج للأندية (AGCFF Gulf Champions League)

  // دولية (البطولات الأساسية المدعومة أصلاً في المنصة)
  { category: "INTERNATIONAL", priority: 30, afId: 39, tsdbId: 4328 }, // الدوري الإنجليزي الممتاز
  { category: "INTERNATIONAL", priority: 31, afId: 140, tsdbId: 4335 }, // الدوري الإسباني
  { category: "INTERNATIONAL", priority: 32, afId: 78, tsdbId: 4331 }, // الدوري الألماني
  { category: "INTERNATIONAL", priority: 33, afId: 2, tsdbId: 4480 }, // دوري أبطال أوروبا
];

export const CATALOG_AF_IDS: number[] = COMPETITION_CATALOG.filter((e) => e.afId !== undefined).map((e) => e.afId!);

export const CATALOG_TSDB_IDS: number[] = COMPETITION_CATALOG.filter((e) => e.tsdbId !== undefined).map(
  (e) => e.tsdbId!
);
