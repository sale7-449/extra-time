import type { Locale } from "./messages";
import { canonicalCompetitionId } from "@/lib/providers/football/ids";

/**
 * أسماء معروفة موثّقة للبطولات الست ولأبرز الأندية التي يغطيها API-Football
 * ضمن هذه البطولات — تُستخدم بدل الاسم الرسمي الإنجليزي فقط عند توفر
 * ترجمة معروفة وموثوقة، وإلا يُعاد اسم مزوّد البيانات كما هو (لا ترجمة آلية).
 */

const COMPETITION_NAMES: Record<number, { ar: string; en: string }> = {
  307: { ar: "دوري روشن السعودي", en: "Saudi Pro League" },
  39: { ar: "الدوري الإنجليزي الممتاز", en: "Premier League" },
  140: { ar: "الدوري الإسباني", en: "La Liga" },
  2: { ar: "دوري أبطال أوروبا", en: "UEFA Champions League" },
  17: { ar: "دوري أبطال آسيا", en: "AFC Champions League" },
  78: { ar: "الدوري الألماني", en: "Bundesliga" },
};

// اسم مختصر لعرضه في بطاقة المباراة الصغيرة (مساحة ضيقة) — نفس البطولات
// الست فقط، بادئة موحّدة لعدم اختلاق اختصار غير موثّق لبطولة أخرى.
const COMPETITION_SHORT_NAMES: Record<number, { ar: string; en: string }> = {
  307: { ar: "روشن", en: "SPL" },
  39: { ar: "البريميرليج", en: "Premier League" },
  140: { ar: "الليغا", en: "La Liga" },
  2: { ar: "أبطال أوروبا", en: "UCL" },
  17: { ar: "أبطال آسيا", en: "ACL" },
  78: { ar: "البوندسليغا", en: "Bundesliga" },
};

// اسم الدولة/الاتحاد كما يُعيده API-Football لكل بطولة من بطولاتنا الست فقط
// (نطاق محدود ومعروف) — يُعرض بجانب اسم البطولة في بطاقتها.
const COUNTRY_NAMES: Record<string, { ar: string; en: string }> = {
  "saudi-arabia": { ar: "السعودية", en: "Saudi Arabia" },
  "saudi arabia": { ar: "السعودية", en: "Saudi Arabia" },
  england: { ar: "إنجلترا", en: "England" },
  spain: { ar: "إسبانيا", en: "Spain" },
  germany: { ar: "ألمانيا", en: "Germany" },
  world: { ar: "عالمي", en: "World" },
  asia: { ar: "آسيا", en: "Asia" },
  europe: { ar: "أوروبا", en: "Europe" },
};

// المفاتيح مُطبَّعة (حروف صغيرة، شرطات → مسافات) — تُقارَن باسم مُطبَّع بنفس
// الطريقة، ثم كخيار احتياطي عبر "يبدأ بـ" حتى تُطابق صيغ API-Football الحقيقية
// التي تضيف لاحقة (مثل "Al-Hilal Saudi FC" أو "Al-Ahli Jeddah").
const TEAM_NAME_OVERRIDES: Record<string, { ar: string; en: string }> = {
  // دوري روشن السعودي
  "al hilal": { ar: "الهلال", en: "Al Hilal" },
  "al nassr": { ar: "النصر", en: "Al Nassr" },
  "al ittihad": { ar: "الاتحاد", en: "Al Ittihad" },
  "al ahli": { ar: "الأهلي", en: "Al Ahli" },
  "al ittifaq": { ar: "الاتفاق", en: "Al Ittifaq" },
  "al taawoun": { ar: "التعاون", en: "Al Taawoun" },
  "al shabab": { ar: "الشباب", en: "Al Shabab" },
  "al fateh": { ar: "الفتح", en: "Al Fateh" },
  "al fayha": { ar: "الفيحاء", en: "Al Fayha" },
  "al raed": { ar: "الرائد", en: "Al Raed" },
  "al riyadh": { ar: "الرياض", en: "Al Riyadh" },
  "al khaleej": { ar: "الخليج", en: "Al Khaleej" },
  damac: { ar: "ضمك", en: "Damac" },
  "al okhdood": { ar: "الأخدود", en: "Al Okhdood" },
  "al wehda": { ar: "الوحدة", en: "Al Wehda" },
  "al hazm": { ar: "الحزم", en: "Al Hazm" },
  "al qadsiah": { ar: "القادسية", en: "Al Qadsiah" },
  "al najma": { ar: "النجمة", en: "Al Najma" },

  // كبار أوروبا
  "real madrid": { ar: "ريال مدريد", en: "Real Madrid" },
  barcelona: { ar: "برشلونة", en: "Barcelona" },
  "atletico madrid": { ar: "أتلتيكو مدريد", en: "Atletico Madrid" },
  "manchester city": { ar: "مانشستر سيتي", en: "Manchester City" },
  "manchester united": { ar: "مانشستر يونايتد", en: "Manchester United" },
  liverpool: { ar: "ليفربول", en: "Liverpool" },
  chelsea: { ar: "تشيلسي", en: "Chelsea" },
  arsenal: { ar: "أرسنال", en: "Arsenal" },
  tottenham: { ar: "توتنهام", en: "Tottenham" },
  "bayern munich": { ar: "بايرن ميونخ", en: "Bayern Munich" },
  "borussia dortmund": { ar: "بوروسيا دورتموند", en: "Borussia Dortmund" },
  "paris saint germain": { ar: "باريس سان جيرمان", en: "Paris Saint-Germain" },
  juventus: { ar: "يوفنتوس", en: "Juventus" },
  "inter milan": { ar: "إنتر ميلان", en: "Inter Milan" },
  "ac milan": { ar: "إيه سي ميلان", en: "AC Milan" },
  "al ain": { ar: "العين", en: "Al Ain" },
  "urawa red diamonds": { ar: "أوراوا ريد دايموندز", en: "Urawa Red Diamonds" },
};

// أطول المفاتيح أولاً حتى لا يُطابق مفتاح عام أقصر (مثل "al ittihad") اسماً
// أدق من مفتاح أطول غير موجود أصلاً — غير ضروري هنا لأن المفاتيح متفرّدة، لكنه
// يبقي ترتيب "يبدأ بـ" متوقعاً لو أُضيفت مفاتيح متشابهة لاحقاً.
const SORTED_KEYS = Object.keys(TEAM_NAME_OVERRIDES).sort((a, b) => b.length - a.length);

// فهرس عكسي (بالاسم العربي) حتى تُترجم أسماء بيانات Mock (المخزَّنة بالعربية
// أصلاً) إلى الإنجليزية أيضاً، لا فقط الاتجاه المعتاد من الإنجليزية للعربية.
const TEAM_NAME_BY_AR: Record<string, { ar: string; en: string }> = Object.fromEntries(
  Object.values(TEAM_NAME_OVERRIDES).map((entry) => [entry.ar, entry])
);

const COUNTRY_NAME_BY_AR: Record<string, { ar: string; en: string }> = Object.fromEntries(
  Object.values(COUNTRY_NAMES).map((entry) => [entry.ar, entry])
);

// بيانات Mock تستخدم مُعرّفات نصية (roshn, premier-league...) مطابقة لمفاتيح
// FEATURED_LEAGUE_IDS في مزوّد API-Football — نحتاج تحويلها لمعرّف رقمي هنا
// كي يعمل نفس القاموس مع كل المصادر (Mock والبيانات الحقيقية).
const SLUG_TO_LEAGUE_ID: Record<string, number> = {
  roshn: 307,
  "premier-league": 39,
  "la-liga": 140,
  ucl: 2,
  acl: 17,
  bundesliga: 78,
};


// نصوص حرة (الجولة/الملعب/الحكم/المدرب) من بيانات Mock الخاصة بنا فقط —
// نص إنجليزي مقابل لكل قيمة عربية مُدخَلة يدوياً في lib/data/matches.ts، حتى
// لا تبقى بالعربية وحدها عند التصفح بالإنجليزية. لا علاقة لهذا ببيانات
// API-Football الحقيقية، إذ تصل جاهزة بالإنجليزية أصلاً من المزوّد.
const MOCK_TEXT_EN: Record<string, string> = {
  "الجولة 12": "Matchday 12",
  "الجولة 11": "Matchday 11",
  "الجولة 9": "Matchday 9",
  الكلاسيكو: "El Clásico",
  "دور المجموعات": "Group Stage",
  "استاد الملك فهد الدولي": "King Fahd International Stadium",
  "استاد الملك عبدالله": "King Abdullah Sports City",
  "سانتياغو برنابيو": "Santiago Bernabéu",
  أنفيلد: "Anfield",
  "أليانز أرينا": "Allianz Arena",
  "مرسول بارك": "Mrsool Park",
  "محمد الحويش": "Mohammed Al-Hoaish",
  "خيسوس كاساس": "Jesus Casas",
  "ستيفانو بيولي": "Stefano Pioli",
};

export function localizeMockText(text: string, locale: Locale): string {
  if (locale !== "en") return text;
  return MOCK_TEXT_EN[text.trim()] ?? text;
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ");
}

export function localizeCompetitionName(apiName: string, id: string | number, locale: Locale): string {
  let numericId: number;
  if (typeof id === "number") {
    numericId = id;
  } else {
    const canonical = canonicalCompetitionId(id);
    numericId = canonical !== null ? Number(canonical) : SLUG_TO_LEAGUE_ID[id] ?? Number(id);
  }
  const entry = COMPETITION_NAMES[numericId];
  return entry ? entry[locale] : apiName;
}

/** نسخة مختصرة من اسم البطولة لبطاقة المباراة — تُعيد null (لا apiName) عند
 * غياب اختصار موثّق، فالمُستدعي يقرّر إخفاء الشارة بدل عرض اسم طويل مقصوص. */
export function localizeCompetitionShortName(id: string, locale: Locale): string | null {
  const canonical = canonicalCompetitionId(id);
  const numericId = canonical !== null ? Number(canonical) : SLUG_TO_LEAGUE_ID[id] ?? Number(id);
  const entry = COMPETITION_SHORT_NAMES[numericId];
  return entry ? entry[locale] : null;
}

export function localizeCountryName(apiName: string, locale: Locale): string {
  const original = apiName.trim();
  const entry = COUNTRY_NAME_BY_AR[original] ?? COUNTRY_NAMES[original.toLowerCase()];
  return entry ? entry[locale] : apiName;
}

export function localizeTeamName(apiName: string, locale: Locale): string {
  const original = apiName.trim();
  const normalized = normalize(original);

  // مطابقة مباشرة (الاسم العربي من Mock، أو الاسم الإنجليزي المطابق تماماً).
  const exact = TEAM_NAME_BY_AR[original] ?? TEAM_NAME_OVERRIDES[normalized];
  if (exact) return exact[locale];

  // مطابقة "يبدأ بـ" لأسماء API-Football الحقيقية التي تضيف لاحقة مثل
  // "Al-Hilal Saudi FC" أو "Al-Ahli Jeddah" — لا نخمّن، فقط نطابق بادئة معروفة.
  const prefixMatch = SORTED_KEYS.find((key) => normalized.startsWith(`${key} `));
  if (prefixMatch) return TEAM_NAME_OVERRIDES[prefixMatch][locale];

  return apiName;
}
