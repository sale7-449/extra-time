import type { NewsCategory, TransferType } from "@/lib/types";

/**
 * تصنيف واشتقاق اسم الفريق من نص الخبر الحقيقي نفسه (عنوان + ملخص) — لا
 * بيانات مختلقة، فقط اكتشاف كلمات مفتاحية معروفة ضمن نص المصدر الأصلي.
 * التصنيف (category) يمثّل البطولة/النوع العام، واسم الفريق (relatedName)
 * أدق منه، لذا لا يُظهران نفس المعلومة مكرَّرة في الواجهة.
 */

// الانتقالات تُفحَص أولاً وتتقدَّم على تصنيف البطولة — خبر انتقال عن نادٍ
// سعودي أهم كـ"انتقالات" منه كخبر دوري عام (قسم مستقل متوقَّع في الواجهة).
const TRANSFER_PATTERN =
  /transfer|sign(s|ing)?|deal|loan move|move to|join(s|ing)?|free agent|contract extension|انتقال|تعاقد|صفقة|رسميا.*تعاقد|ينضم|يرحل عن|يعير|عارية|حر\b/i;

// كل بطولة مربوطة بمعرّفها الموحَّد (نفس أرقام API-Football) فقط للبطولات
// الست الفعلية المتتبَّعة في المنصة (لها صفحة حقيقية) — Serie A وLigue 1
// وInternational تصنيف عرض فقط، بلا رابط بطولة (لا صفحة حقيقية لها بعد).
const CATEGORY_KEYWORDS: Array<{ pattern: RegExp; category: NewsCategory; competitionId?: string }> = [
  { pattern: /saudi pro league|saudi league|al[\s-]hilal|al[\s-]nassr|al[\s-]ittihad|al[\s-]ahli|الدوري السعودي|دوري روشن/i, category: "SAUDI_LEAGUE", competitionId: "307" },
  { pattern: /champions league|دوري أبطال أوروبا|أبطال أوروبا/i, category: "CHAMPIONS_LEAGUE", competitionId: "2" },
  { pattern: /premier league|الدوري الإنجليزي/i, category: "PREMIER_LEAGUE", competitionId: "39" },
  { pattern: /la liga|real madrid|barcelona|الدوري الإسباني|ريال مدريد|برشلونة/i, category: "LA_LIGA", competitionId: "140" },
  { pattern: /bundesliga|bayern munich|borussia dortmund|الدوري الألماني|البوندسليغا|بايرن ميونخ/i, category: "BUNDESLIGA", competitionId: "78" },
  { pattern: /serie a\b|juventus|inter milan|\bac milan\b|الدوري الإيطالي|يوفنتوس|إنتر ميلان|ميلان/i, category: "SERIE_A" },
  { pattern: /ligue 1|paris saint.germain|\bpsg\b|الدوري الفرنسي|باريس سان جيرمان/i, category: "LIGUE_1" },
  { pattern: /world cup|national team|squad|international break|كأس العالم|منتخب|الأمم/i, category: "INTERNATIONAL" },
];

const TEAM_KEYWORDS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /al[\s-]hilal|\bالهلال\b/i, name: "Al Hilal" },
  { pattern: /al[\s-]nassr|\bالنصر\b/i, name: "Al Nassr" },
  { pattern: /al[\s-]ittihad|اتحاد جدة|نادي الاتحاد/i, name: "Al Ittihad" },
  { pattern: /al[\s-]ahli|\bالأهلي\b/i, name: "Al Ahli" },
  { pattern: /real madrid|ريال مدريد/i, name: "Real Madrid" },
  { pattern: /barcelona|برشلونة/i, name: "Barcelona" },
  { pattern: /manchester city|مانشستر سيتي/i, name: "Manchester City" },
  { pattern: /manchester united|مانشستر يونايتد/i, name: "Manchester United" },
  { pattern: /liverpool|ليفربول/i, name: "Liverpool" },
  { pattern: /chelsea|تشيلسي/i, name: "Chelsea" },
  { pattern: /arsenal|أرسنال/i, name: "Arsenal" },
  { pattern: /tottenham|توتنهام/i, name: "Tottenham" },
  { pattern: /bayern munich|بايرن ميونخ/i, name: "Bayern Munich" },
  { pattern: /borussia dortmund|بروسيا دورتموند/i, name: "Borussia Dortmund" },
  { pattern: /paris saint.germain|\bpsg\b|باريس سان جيرمان/i, name: "Paris Saint-Germain" },
  { pattern: /juventus|يوفنتوس/i, name: "Juventus" },
  { pattern: /inter milan|إنتر ميلان/i, name: "Inter Milan" },
  { pattern: /\bac milan\b|\bميلان\b/i, name: "AC Milan" },
  { pattern: /aston villa/i, name: "Aston Villa" },
  { pattern: /crystal palace/i, name: "Crystal Palace" },
  { pattern: /sunderland/i, name: "Sunderland" },
  { pattern: /everton/i, name: "Everton" },
  { pattern: /leicester/i, name: "Leicester" },
];

/** إشارات عامة تدلّ على أن الخبر عن كرة القدم تحديداً — تُستخدم فقط لتصفية
 * موجزات "رياضة عامة" (مثل RT Arabic /sport/) التي تخلط كرة القدم برياضات
 * أخرى، كي لا تظهر أخبار تنس/رفع أثقال/مصارعة داخل منصة كرة قدم بحتة. */
const FOOTBALL_HINT_PATTERN =
  /كرة القدم|الدوري (الإنجليزي|الإسباني|السعودي|الألماني|الإيطالي|الفرنسي)|دوري أبطال|كأس العالم|الكلاسيكو|مباراة|هدف|ملعب|مدرب|صفقة|انتقال|تعاقد|\bنادي\b|منتخب|قدم|لاعب/;

// كلمات محدَّدة جداً لكرة القدم فقط (مصطلحات لا تُستخدم لرياضة أخرى) —
// تكفي وحدها لتجاوز استثناء "رياضة أخرى" أدناه حتى لو ورد اسم رياضة أخرى
// عرضاً ضمن نفس الخبر (نادر، لكن للسلامة).
const STRONG_FOOTBALL_PATTERN =
  /\bfootball\b|\bsoccer\b|premier league|la liga|bundesliga|serie a|ligue 1|champions league|كرة القدم|الدوري (الإنجليزي|الإسباني|السعودي|الألماني|الإيطالي|الفرنسي)|دوري أبطال|ركلة جزاء|تسلل|ضربة جزاء|مرمى|تشكيلة أساسية/i;

// رياضات أخرى تتشارك مصادرنا (Sky/BBC/RT العامة) — وجود أيٍّ منها بلا إشارة
// كرة قدم قوية معاكسة يعني استبعاد الخبر، لا تخمين أنه كرة قدم. القائمة لا
// تشمل رياضات نادرة الظهور لتقليل رفض كاذب لخبر كرة قدم شرعي.
const OTHER_SPORT_PATTERN =
  /\btennis\b|\bgolf\b|\bboxing\b|\bcricket\b|\brugby\b|\bnfl\b|\bnba\b|\bbasketball\b|formula (one|1)|\bf1\b|grand prix|\bathletics\b|\bswimming\b|\bwrestling\b|\bufc\b|\bmma\b|us open|wimbledon|ryder cup|solheim cup|تنس\b|غولف|جولف|ملاكمة|كريكيت|كرة السلة|ال(ر|إر)غبي|ألعاب القوى|السباحة|المصارعة|فورمولا/i;

export function classifyArticle(
  title: string,
  description: string
): { category: NewsCategory; relatedName?: string; competitionId?: string } {
  const text = `${title} ${description}`;

  if (TRANSFER_PATTERN.test(text)) {
    const relatedName = TEAM_KEYWORDS.find((entry) => entry.pattern.test(text))?.name;
    return { category: "TRANSFERS", relatedName };
  }

  const leagueMatch = CATEGORY_KEYWORDS.find((entry) => entry.pattern.test(text));
  const relatedName = TEAM_KEYWORDS.find((entry) => entry.pattern.test(text))?.name;

  return {
    category: leagueMatch?.category ?? "FOOTBALL",
    relatedName,
    competitionId: leagueMatch?.competitionId,
  };
}

/**
 * يُطبَّق على كل المصادر (لا RT Arabic فقط) — تبيّن باختبار حقيقي أن مسارات
 * RSS "الرياضية/الكروية" المفترَضة (Sky/BBC/الأخرى) تُسرّب فعلياً تنس/غولف/
 * ملاكمة/كريكيت. القاعدة: رياضة أخرى مذكورة صراحة بلا إشارة كرة قدم قوية
 * معاكسة = استبعاد فوري (لا حاجة لفحص أعمق). خلاف ذلك: اسم فريق معروف أو
 * إشارة كرة قدم عامة = قبول. لا افتراض افتراضي بالقبول — عدم أي إشارة يعني
 * الرفض (أدق من قبول كل شيء لم يُستبعَد صراحة).
 */
export function isFootballArticle(title: string, description: string): boolean {
  const text = `${title} ${description}`;

  if (OTHER_SPORT_PATTERN.test(text) && !STRONG_FOOTBALL_PATTERN.test(text)) return false;

  return TEAM_KEYWORDS.some((entry) => entry.pattern.test(text)) || FOOTBALL_HINT_PATTERN.test(text) || STRONG_FOOTBALL_PATTERN.test(text);
}

// ترتيب الفحص من الأكثر تحديداً — عقد جديد/إعارة/انتقال حر أوضح من "رسمي"
// العام، و"رسمي" أوضح من مجرد إشاعة. لا قيمة افتراضية: عدم تطابق واثق يعني
// undefined بدل تخمين نوع الصفقة.
const TRANSFER_TYPE_PATTERNS: Array<{ pattern: RegExp; type: TransferType }> = [
  { pattern: /\bloan\b|on loan|عارية|إعارة|معار/i, type: "LOAN" },
  { pattern: /free transfer|free agent|bosman|صفقة مجانية|ينتقل مجاناً|بند الحرية|لاعب حر/i, type: "FREE_TRANSFER" },
  { pattern: /contract extension|new contract|renew(s|al)?|extends? (his |her )?contract|عقد جديد|تجديد العقد|يجدد عقده/i, type: "CONTRACT" },
  { pattern: /official(ly)?|confirm(ed|s)?|complete(s|d)? (a |the )?(move|transfer|deal)|done deal|has signed|have signed|رسميًا|رسميا|يعلن التعاقد|أعلن تعاقد|أتم التعاقد/i, type: "OFFICIAL" },
  { pattern: /linked (with|to)|interested in|target(ing)?|could (sign|join|move)|reportedly|rumou?r|eyeing|weighing up|mull(ing)?|يقترب من|مهتم بـ|يتابع|صفقة محتملة|شائعات|في رادار/i, type: "RUMOUR" },
];

/** يُستدعى فقط لمقالات مصنَّفة TRANSFERS بالفعل. يُعيد undefined بصدق إن لم
 * يحمل النص إشارة واضحة لنوع الصفقة — لا قاعدة انتقالات منظّمة مؤكدة. */
export function findTransferType(title: string, description: string): TransferType | undefined {
  const text = `${title} ${description}`;
  return TRANSFER_TYPE_PATTERNS.find((entry) => entry.pattern.test(text))?.type;
}
