/**
 * كل معرّف (Match/Team/Competition) قادم من مصدر بيانات حقيقي يُسبَق برمز
 * المصدر (af-/tsdb-) — يسمح بتوجيه lookups لمعرّف واحد (مباراة/بطولة) إلى
 * المزوّد الصحيح مباشرة، بدل تخمين المصدر من شكل الرقم. معرّفات Mock تبقى
 * كما هي (نصوص وصفية مثل hilal-nassr-live) ولا تتعارض مع أي بادئة.
 */
export type ProviderTag = "af" | "tsdb" | "espn";

export function tagId(provider: ProviderTag, rawId: number | string): string {
  return `${provider}-${rawId}`;
}

export function parseTaggedId(id: string): { provider: ProviderTag | null; rawId: string } {
  const match = id.match(/^(af|tsdb|espn)-(.+)$/);
  if (!match) return { provider: null, rawId: id };
  return { provider: match[1] as ProviderTag, rawId: match[2] };
}

// TheSportsDB يستخدم معرّفات بطولات مختلفة تماماً عن API-Football لنفس
// البطولة — تحويل مباشر مؤكَّد يدوياً عبر حقل idAPIfootballv3 الذي تُعيده
// TheSportsDB نفسها (يطابق أرقام API-Football تماماً). لا يوجد معرّف AFC
// Champions League موثوق على TheSportsDB بعد، فلا يظهر هنا.
const TSDB_TO_AF_LEAGUE_ID: Record<string, string> = {
  "4668": "307",
  "4328": "39",
  "4335": "140",
  "4331": "78",
  "4480": "2",
};

// ESPN يستخدم Slugs نصية (ksa.1, eng.1...) بدل أرقام — تحويل مباشر لنفس
// أرقام API-Football كي تُقارَن البطولات بمعرّف موحَّد بغض النظر عن المصدر.
export const ESPN_SLUG_TO_AF_LEAGUE_ID: Record<string, string> = {
  "ksa.1": "307",
  "eng.1": "39",
  "esp.1": "140",
  "ger.1": "78",
  "uefa.champions": "2",
  "afc.champions": "17",
};

const AF_LEAGUE_ID_TO_ESPN_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(ESPN_SLUG_TO_AF_LEAGUE_ID).map(([slug, af]) => [af, slug])
);

export function espnSlugForCanonicalLeague(canonicalAfId: string): string | null {
  return AF_LEAGUE_ID_TO_ESPN_SLUG[canonicalAfId] ?? null;
}

/**
 * يُرجع مُعرّفاً موحَّداً (رقم API-Football كسلسلة نصية) لبطولة بغض النظر
 * عن المصدر الذي أنتج المعرّف — يسمح بمقارنة "هل هذه المباراة من نفس
 * البطولة؟" بين مصدرين مختلفين بدل مقارنة نصية حرفية تفشل دوماً بينهما.
 * يُعيد null لمعرّفات Mock أو غير معروفة (تُقارَن كما هي عندئذ).
 */
export function canonicalCompetitionId(id: string): string | null {
  const { provider, rawId } = parseTaggedId(id);
  if (provider === "af") return rawId;
  if (provider === "tsdb") return TSDB_TO_AF_LEAGUE_ID[rawId] ?? null;
  if (provider === "espn") return ESPN_SLUG_TO_AF_LEAGUE_ID[rawId] ?? null;
  return null;
}
