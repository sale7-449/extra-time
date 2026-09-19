import { COMPETITION_CATALOG } from "@/lib/providers/football/competition-catalog";
import { canonicalCompetitionId } from "@/lib/providers/football/ids";

/**
 * المصدر المركزي الوحيد لشعارات البطولات. كل عرض لشعار بطولة في الموقع يمرّ
 * عبر <CompetitionLogo> (components/shared/CompetitionLogo.tsx) الذي يسأل هذه
 * الدالة — لا معالجة لكل صفحة أو بطولة على حدة.
 *
 * لماذا هنا لا من بيانات المزوّد وحدها: شعار البطولة كان يأتي فقط من حقل
 * `logoUrl` الذي يُرجعه المزوّد الذي نجح في تلك الطلبية. حين يتعطّل
 * API-Football (حسابه موقوف حالياً) تصل البطولات من TheSportsDB الذي لا يغطّي
 * إلا 5 من 12 بطولة في الكتالوج، فتُبنى الباقية كبطاقات بديلة بلا `logoUrl`
 * وتختفي شعاراتها. الحل: الشعار يُشتقّ من معرّف API-Football الحقيقي الموثَّق
 * أصلاً في COMPETITION_CATALOG عبر CDN الوسائط العام الرسمي للخدمة نفسها
 * (نفس الرابط الذي يُرجعه API في حقل league.logo)، مستقلاً عن أي مزوّد نجح
 * الآن. كل معرّف في الكتالوج مُتحقَّق أنه يُعيد صورة فعلية (انظر اختبار
 * الكتالوج) — لا معرّف ولا شعار مخمَّن.
 */
const AF_LEAGUE_LOGO_BASE = "https://media.api-sports.io/football/leagues";

const CATALOG_AF_IDS = new Set(COMPETITION_CATALOG.filter((e) => e.afId !== undefined).map((e) => String(e.afId)));

/** رابط شعار البطولة من الكتالوج، أو null لبطولة ليست في الكتالوج. */
export function catalogCompetitionLogoUrl(competitionId: string): string | null {
  const canonical = canonicalCompetitionId(competitionId);
  return canonical !== null && CATALOG_AF_IDS.has(canonical) ? `${AF_LEAGUE_LOGO_BASE}/${canonical}.png` : null;
}

/** المرشَّحات بالترتيب: شعار الكتالوج أولاً، ثم شعار المزوّد إن كان مختلفاً (بطولة
 * خارج الكتالوج، أو فشل تحميل الأول). يُجرَّب كلٌّ بالتتابع عند فشل التحميل، وإن
 * فشلت كلها يعرض المكوّن أيقونة كأس ثابتة داخل الحاوية نفسها لا مساحة فارغة. */
export function competitionLogoCandidates(competitionId: string, providerLogoUrl?: string | null): string[] {
  const candidates = [catalogCompetitionLogoUrl(competitionId), providerLogoUrl ?? null].filter(
    (url): url is string => typeof url === "string" && /^https?:\/\//.test(url)
  );
  return [...new Set(candidates)];
}
