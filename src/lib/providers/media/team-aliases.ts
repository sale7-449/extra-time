/**
 * أسماء بديلة معروفة (رسمية/شائعة/عربية) للأندية التي يُحتمل ظهورها في
 * عناوين فيديوهات القنوات الرسمية المعتمدة أو خصومها — قاموس صريح ومحدود
 * يُوسَّع يدوياً عند الحاجة، لا توليد عشوائي. أي فريق غير مذكور هنا لا يزال
 * قابلاً للمطابقة عبر `normalizeLoose` وحدها (راجع `teamNameVariants`) —
 * هذا القاموس يعالج فقط الاستثناءات (لقب/اختصار/اسم عربي) التي لا يكتشفها
 * التطبيع العام.
 */
const CLUB_ALIASES: Record<string, string[]> = {
  "Al Hilal": ["الهلال", "الهلال السعودي", "al hilal", "al-hilal", "alhilal", "al hilal saudi"],
  "Al Nassr": ["النصر", "النصر السعودي", "al nassr", "al-nassr", "alnassr"],
  "Al Ittihad": ["الاتحاد", "الاتحاد السعودي", "al ittihad", "al-ittihad", "alittihad"],
  "Al Ahli": ["الأهلي", "الأهلي السعودي", "al ahli", "al-ahli", "alahli"],
  "Al Shabab": ["الشباب", "al shabab", "al-shabab"],
  "Al Ettifaq": ["الاتفاق", "al ettifaq", "al-ettifaq", "ettifaq"],
  "Real Madrid": ["ريال مدريد", "real madrid", "real madrid cf"],
  "Barcelona": ["برشلونة", "barcelona", "fc barcelona", "barça", "barca"],
  "Rayo Vallecano": ["رايو فاييكانو", "رايو", "rayo vallecano", "rayo"],
  "Atletico Madrid": ["أتلتيكو مدريد", "atletico madrid", "atlético madrid", "atleti"],
  "Valencia": ["فالنسيا", "valencia", "valencia cf"],
  "Manchester City": ["مانشستر سيتي", "manchester city", "man city"],
  "Manchester United": ["مانشستر يونايتد", "manchester united", "man utd", "man united"],
  "Liverpool": ["ليفربول", "liverpool"],
  "Chelsea": ["تشيلسي", "chelsea"],
  "Arsenal": ["أرسنال", "arsenal"],
  "Tottenham": ["توتنهام", "tottenham", "spurs", "tottenham hotspur"],
  "Everton": ["إيفرتون", "everton"],
  "Aston Villa": ["أستون فيلا", "aston villa"],
  "Bayern Munich": ["بايرن ميونخ", "bayern munich", "bayern", "fc bayern", "fc bayern münchen"],
  "Borussia Dortmund": ["بوروسيا دورتموند", "borussia dortmund", "dortmund", "bvb"],
  "Paris Saint-Germain": ["باريس سان جيرمان", "paris saint-germain", "psg", "paris sg"],
  "Juventus": ["يوفنتوس", "juventus", "juve"],
  "Inter Milan": ["إنتر ميلان", "inter milan", "internazionale", "inter"],
  "AC Milan": ["ميلان", "ac milan"],
};

function normalizeLoose(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|cfc)\b/g, "")
    .replace(/[-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** حدود كلمة (\b) للصيغ اللاتينية فقط — \b في JS مبني على [A-Za-z0-9_] ولا
 * يتعرّف على حروف عربية أصلاً، فتطبيقه على صيغة عربية يُبطل المطابقة كلياً
 * بدل تحسينها. الصيغ العربية هنا مُميَّزة بما يكفي طولاً لتفادي التطابق
 * العرضي بلا حدود صريحة. */
function buildVariantPattern(variant: string): RegExp {
  const isLatin = /^[a-z0-9\s'-]+$/i.test(variant);
  const escaped = escapeRegExp(variant);
  return isLatin ? new RegExp(`\\b${escaped}\\b`, "i") : new RegExp(escaped, "i");
}

/** يبني مجموعة صيغ محتملة لاسم فريق: اسمه كما يُعيده مزوّد المباريات + أي
 * أسماء بديلة مُقرَّرة من القاموس أعلاه (مطابقة بعد تطبيع خفيف) — لا حاجة
 * لإدخال كل فريق ممكن يدوياً، القاموس يغطي الاستثناءات فقط. */
export function teamNameVariants(providerName: string): string[] {
  const normalized = normalizeLoose(providerName);
  const curated = Object.entries(CLUB_ALIASES).find(
    ([canonical, aliases]) => normalizeLoose(canonical) === normalized || aliases.some((a) => normalizeLoose(a) === normalized)
  );

  const variants = new Set<string>([providerName, normalized]);
  if (curated) {
    variants.add(curated[0]);
    curated[1].forEach((a) => variants.add(a));
  }
  return [...variants].filter((v) => v.trim().length > 2);
}

/** هل يذكر النص (عنوان/وصف فيديو) هذا الفريق فعلياً — بأي صيغة معروفة له؟ */
export function textMentionsTeam(text: string, providerTeamName: string): boolean {
  return teamNameVariants(providerTeamName).some((variant) => buildVariantPattern(variant).test(text));
}
