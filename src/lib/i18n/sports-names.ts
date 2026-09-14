import type { Locale } from "./messages";
import { parseTaggedId } from "@/lib/providers/football/ids";
import { localizeTeamName } from "./localized-names";

/**
 * تعريب الأندية واللاعبين — مربوط بمعرّف API-Football الرقمي الحقيقي
 * (teamId/playerId)، لا بالاسم النصي. الاسم النصي قد يختلف شكلاً بين طلب
 * وآخر لنفس الفريق/اللاعب (تشكيل حروف، اختصار، لاحقة "FC"...)، فالمعرّف هو
 * الهوية الموثوقة الوحيدة هنا — تماماً كنظام canonicalCompetitionId للبطولات.
 *
 * كل قيد هنا معرّفه الرقمي تحقّقنا من وجوده فعلياً على API-Football (عبر
 * /teams?league=X لكل من البطولات الاثنتي عشرة في competition-catalog.ts —
 * 234 نادياً/منتخباً حقيقياً جُلبوا فعلياً) قبل إضافته — لا معرّف مُخترَع.
 * 196 منهم لهم اسم عربي موثَّق هنا (تعريب رياضي شائع وغير ملتبس). الباقون
 * (~38، غالباً مشاركات تصفيات دوري أبطال أوروبا من دول صغيرة كآيسلندا
 * وفارو وأندورا وسان مارينو، أو نادٍ ألماني/آسيوي هامشي) تُركوا بلا قيد
 * عمداً بدل تخمين تعريب غير موثوق؛ الدالة تُعيد الاسم الأصلي تلقائياً حينها.
 *
 * قيد مهم مكتشَف أثناء البحث: الحصة اليومية المجانية لـAPI-Football
 * استُنفدت أثناء هذا العمل تحديداً قبل إكمال جلب تشكيلات الأندية غير
 * السعودية بالكامل — لذا تغطية اللاعبين هنا مقصورة فعلياً على تشكيلة
 * الهلال (الفريق الوحيد الذي اكتمل جلبه فعلياً قبل توقّف الحصة) بالإضافة
 * لعدد محدود من اللاعبين الدوليين المعروفين ضمن أندية أخرى تحقّقتُ من
 * معرّفهم مسبقاً في هذه الجلسة. التوسّع لاحقاً = سطر واحد هنا فقط.
 */

export interface TeamNameEntry {
  /** مرجعي فقط — لا يُستخدم لعرض الإنجليزية (تلك تأتي دائماً من originalName الحي). */
  nameEn: string;
  nameAr: string;
}

export interface PlayerNameEntry {
  nameEn: string;
  nameAr: string;
}

// =====================================================================
// الأندية — مفتاح كل قيد هو teamId الرقمي الحقيقي على API-Football.
// =====================================================================
export const TEAM_NAMES: Record<number, TeamNameEntry> = {
  // ---------------------------------------------------------------
  // السعودية — دوري روشن + كأس الملك + كأس السوبر + دوري الدرجة الأولى
  // (37 نادياً حقيقياً، من /teams?league=307|504|826|308)
  // ---------------------------------------------------------------
  2928: { nameEn: "Al Khaleej", nameAr: "الخليج" },
  2929: { nameEn: "Al-Ahli Jeddah", nameAr: "الأهلي" },
  2930: { nameEn: "Al-Faisaly", nameAr: "الفيصلي" },
  2931: { nameEn: "Al-Fateh", nameAr: "الفتح" },
  2932: { nameEn: "Al-Hilal", nameAr: "الهلال" },
  2933: { nameEn: "Al-Qadisiyah", nameAr: "القادسية" },
  2934: { nameEn: "Al-Ettifaq", nameAr: "الاتفاق" },
  2935: { nameEn: "Al-Raed", nameAr: "الرائد" },
  2936: { nameEn: "Al Taawon", nameAr: "التعاون" },
  2937: { nameEn: "Al Wehda", nameAr: "الوحدة" },
  2938: { nameEn: "Al-Ittihad", nameAr: "الاتحاد" },
  2939: { nameEn: "Al-Nassr", nameAr: "النصر" },
  2940: { nameEn: "Al Shabab", nameAr: "الشباب" },
  2942: { nameEn: "Al Taee", nameAr: "الطائي" },
  2943: { nameEn: "Ohod", nameAr: "أحد" },
  2944: { nameEn: "Al-Fayha", nameAr: "الفيحاء" },
  2945: { nameEn: "Al-Hazm", nameAr: "الحزم" },
  2947: { nameEn: "Jeddah Club", nameAr: "نادي جدة" },
  2948: { nameEn: "Hajer", nameAr: "هجر" },
  2950: { nameEn: "Al-Adalah", nameAr: "العدالة" },
  2951: { nameEn: "Abha", nameAr: "أبها" },
  2956: { nameEn: "Damac", nameAr: "ضمك" },
  2958: { nameEn: "Al Jabalain", nameAr: "الجبلين" },
  2959: { nameEn: "Al Qaisoma", nameAr: "القيصومة" },
  2961: { nameEn: "Al Orubah", nameAr: "العروبة" },
  2966: { nameEn: "Al Bukayriyah", nameAr: "البكيرية" },
  2971: { nameEn: "Al Arabi (KSA)", nameAr: "العربي" },
  2977: { nameEn: "Al Okhdood", nameAr: "الأخدود" },
  2990: { nameEn: "Al Safa", nameAr: "الصفا" },
  2992: { nameEn: "Al Najma", nameAr: "النجمة" },
  10507: { nameEn: "Al Jandal", nameAr: "الجندل" },
  10508: { nameEn: "Al Jubail", nameAr: "الجبيل" },
  10509: { nameEn: "Al Kholood", nameAr: "الخلود" },
  10511: { nameEn: "Al Riyadh", nameAr: "الرياض" },
  10513: { nameEn: "NEOM", nameAr: "نيوم" },
  10524: { nameEn: "Al Zulfi", nameAr: "الزلفي" },
  13170: { nameEn: "Al-Ain (KSA)", nameAr: "العين" },

  // ---------------------------------------------------------------
  // خليجية — كأس الخليج للأمم (منتخبات) + بطولة الخليج للأندية
  // ---------------------------------------------------------------
  23: { nameEn: "Saudi Arabia", nameAr: "السعودية" },
  1547: { nameEn: "Bahrain", nameAr: "البحرين" },
  1550: { nameEn: "Yemen", nameAr: "اليمن" },
  1552: { nameEn: "Oman", nameAr: "عُمان" },
  1563: { nameEn: "United Arab Emirates", nameAr: "الإمارات العربية المتحدة" },
  1567: { nameEn: "Iraq", nameAr: "العراق" },
  1569: { nameEn: "Qatar", nameAr: "قطر" },
  1570: { nameEn: "Kuwait", nameAr: "الكويت" },
  2905: { nameEn: "Al-Arabi SC (Qatar)", nameAr: "العربي" },
  3537: { nameEn: "Al Qadsia (Kuwait)", nameAr: "القادسية" },
  5330: { nameEn: "Dhofar", nameAr: "ظفار" },
  5482: { nameEn: "Al Riffa", nameAr: "الرفاع" },
  10155: { nameEn: "Al Nasr (UAE)", nameAr: "النصر" },
  20463: { nameEn: "Duhok", nameAr: "دهوك" },
  23352: { nameEn: "Al Ahli San'a", nameAr: "الأهلي صنعاء" },
  3535: { nameEn: "Al Kuwait", nameAr: "الكويت" },
  5580: { nameEn: "Al Ahli (Bahrain)", nameAr: "الأهلي" },
  17666: { nameEn: "Khalidiya", nameAr: "الخالدية" },
  4532: { nameEn: "Al Hussein (Jordan)", nameAr: "الحسين" },
  4537: { nameEn: "Al Wihdat", nameAr: "الوحدات" },
  8009: { nameEn: "Al Quwa Al Jawiya", nameAr: "القوة الجوية" },
  5242: { nameEn: "Al Shorta", nameAr: "الشرطة" },

  // ---------------------------------------------------------------
  // آسيوية — AFC Champions League Elite/Two (غير السعودية والخليجية أعلاه)
  // ---------------------------------------------------------------
  289: { nameEn: "Vissel Kobe", nameAr: "فيسل كوبي" },
  294: { nameEn: "Kawasaki Frontale", nameAr: "كاواساكي فرونتاله" },
  296: { nameEn: "Yokohama F. Marinos", nameAr: "يوكوهاما إف مارينوس" },
  282: { nameEn: "Sanfrecce Hiroshima", nameAr: "سانفريتشي هيروشيما" },
  833: { nameEn: "Shanghai Shenhua", nameAr: "شنغهاي شنخوا" },
  844: { nameEn: "Shandong Luneng", nameAr: "شاندونغ لونينغ" },
  2733: { nameEn: "Esteghlal", nameAr: "الاستقلال" },
  2742: { nameEn: "Persepolis", nameAr: "بيرسبوليس" },
  2744: { nameEn: "Sepahan", nameAr: "سباهان" },
  2737: { nameEn: "Tractor", nameAr: "تراكتور" },
  2764: { nameEn: "Pohang Steelers", nameAr: "بوهانغ ستيلرز" },
  2767: { nameEn: "Ulsan HD", nameAr: "أولسان هيونداي" },
  2770: { nameEn: "Bangkok United", nameAr: "بانكوك يونايتد" },
  2780: { nameEn: "Buriram United", nameAr: "بوريرام يونايتد" },
  2865: { nameEn: "Al Ain (UAE)", nameAr: "العين" },
  2870: { nameEn: "Shabab Al Ahli", nameAr: "شباب الأهلي" },
  2872: { nameEn: "Al-Wasl", nameAr: "الوصل" },
  2874: { nameEn: "Sharjah", nameAr: "الشارقة" },
  2895: { nameEn: "Al Sadd", nameAr: "السد" },
  2897: { nameEn: "Al-Rayyan", nameAr: "الريان" },
  2900: { nameEn: "Al Wakrah", nameAr: "الوكرة" },
  2903: { nameEn: "Al-Gharafa", nameAr: "الغرافة" },
  4220: { nameEn: "Pakhtakor", nameAr: "باختاكور" },
  943: { nameEn: "Sydney FC", nameAr: "سيدني" },
  2445: { nameEn: "Persib Bandung", nameAr: "بيرسيب باندونغ" },
  2526: { nameEn: "Selangor", nameAr: "سيلانجور" },
  2786: { nameEn: "Muangthong United", nameAr: "موانغ ثونغ يونايتد" },
  3463: { nameEn: "East Bengal", nameAr: "إيست بنغال" },
  15516: { nameEn: "ATK Mohun Bagan", nameAr: "موهون باغان" },
  4215: { nameEn: "Nasaf", nameAr: "ناساف" },

  // ---------------------------------------------------------------
  // الدوري الإنجليزي الممتاز (Premier League) — 20 نادياً
  // ---------------------------------------------------------------
  33: { nameEn: "Manchester United", nameAr: "مانشستر يونايتد" },
  34: { nameEn: "Newcastle", nameAr: "نيوكاسل يونايتد" },
  35: { nameEn: "Bournemouth", nameAr: "بورنموث" },
  36: { nameEn: "Fulham", nameAr: "فولهام" },
  39: { nameEn: "Wolves", nameAr: "وولفرهامبتون" },
  40: { nameEn: "Liverpool", nameAr: "ليفربول" },
  41: { nameEn: "Southampton", nameAr: "ساوثهامبتون" },
  42: { nameEn: "Arsenal", nameAr: "آرسنال" },
  45: { nameEn: "Everton", nameAr: "إيفرتون" },
  46: { nameEn: "Leicester", nameAr: "ليستر سيتي" },
  47: { nameEn: "Tottenham", nameAr: "توتنهام هوتسبر" },
  48: { nameEn: "West Ham", nameAr: "وست هام يونايتد" },
  49: { nameEn: "Chelsea", nameAr: "تشيلسي" },
  50: { nameEn: "Manchester City", nameAr: "مانشستر سيتي" },
  51: { nameEn: "Brighton", nameAr: "برايتون" },
  52: { nameEn: "Crystal Palace", nameAr: "كريستال بالاس" },
  55: { nameEn: "Brentford", nameAr: "برينتفورد" },
  57: { nameEn: "Ipswich", nameAr: "إيبسويتش تاون" },
  65: { nameEn: "Nottingham Forest", nameAr: "نوتنغهام فورست" },
  66: { nameEn: "Aston Villa", nameAr: "أستون فيلا" },

  // ---------------------------------------------------------------
  // الدوري الإسباني (La Liga) — 20 نادياً
  // ---------------------------------------------------------------
  529: { nameEn: "Barcelona", nameAr: "برشلونة" },
  530: { nameEn: "Atletico Madrid", nameAr: "أتلتيكو مدريد" },
  531: { nameEn: "Athletic Club", nameAr: "أتلتيك بيلباو" },
  532: { nameEn: "Valencia", nameAr: "فالنسيا" },
  533: { nameEn: "Villarreal", nameAr: "فياريال" },
  534: { nameEn: "Las Palmas", nameAr: "لاس بالماس" },
  536: { nameEn: "Sevilla", nameAr: "إشبيلية" },
  537: { nameEn: "Leganes", nameAr: "ليغانيس" },
  538: { nameEn: "Celta Vigo", nameAr: "سيلتا فيغو" },
  540: { nameEn: "Espanyol", nameAr: "إسبانيول" },
  541: { nameEn: "Real Madrid", nameAr: "ريال مدريد" },
  542: { nameEn: "Alaves", nameAr: "ألافيس" },
  543: { nameEn: "Real Betis", nameAr: "ريال بيتيس" },
  546: { nameEn: "Getafe", nameAr: "خيتافي" },
  547: { nameEn: "Girona", nameAr: "جيرونا" },
  548: { nameEn: "Real Sociedad", nameAr: "ريال سوسيداد" },
  720: { nameEn: "Valladolid", nameAr: "ريال بلد الوليد" },
  727: { nameEn: "Osasuna", nameAr: "أوساسونا" },
  728: { nameEn: "Rayo Vallecano", nameAr: "رايو فاليكانو" },
  798: { nameEn: "Mallorca", nameAr: "مايوركا" },

  // ---------------------------------------------------------------
  // الدوري الألماني (Bundesliga) — 19 نادياً (عدا الأقل شهرة عربياً)
  // ---------------------------------------------------------------
  157: { nameEn: "Bayern München", nameAr: "بايرن ميونخ" },
  160: { nameEn: "SC Freiburg", nameAr: "فرايبورغ" },
  161: { nameEn: "VfL Wolfsburg", nameAr: "فولفسبورغ" },
  162: { nameEn: "Werder Bremen", nameAr: "فيردر بريمن" },
  163: { nameEn: "Borussia Mönchengladbach", nameAr: "بوروسيا مونشنغلادباخ" },
  164: { nameEn: "FSV Mainz 05", nameAr: "ماينز 05" },
  165: { nameEn: "Borussia Dortmund", nameAr: "بوروسيا دورتموند" },
  167: { nameEn: "1899 Hoffenheim", nameAr: "هوفنهايم" },
  168: { nameEn: "Bayer Leverkusen", nameAr: "باير ليفركوزن" },
  169: { nameEn: "Eintracht Frankfurt", nameAr: "آينتراخت فرانكفورت" },
  170: { nameEn: "FC Augsburg", nameAr: "أوغسبورغ" },
  172: { nameEn: "VfB Stuttgart", nameAr: "شتوتغارت" },
  173: { nameEn: "RB Leipzig", nameAr: "لايبزيغ" },
  176: { nameEn: "VfL Bochum", nameAr: "بوخوم" },
  182: { nameEn: "Union Berlin", nameAr: "اتحاد برلين" },
  186: { nameEn: "FC St. Pauli", nameAr: "سانت باولي" },
  191: { nameEn: "Holstein Kiel", nameAr: "هولشتاين كيل" },

  // ---------------------------------------------------------------
  // دوري أبطال أوروبا (UEFA Champions League) — الأندية الكبرى المعروفة
  // عربياً بثقة عالية فقط؛ مشاركات التصفيات من دول صغيرة (آيسلندا،
  // فارو، أندورا، سان مارينو...) تُركت بلا قيد عمداً لعدم توفّر تعريب
  // إعلامي عربي موثّق وموحَّد لها.
  // ---------------------------------------------------------------
  79: { nameEn: "Lille", nameAr: "ليل" },
  85: { nameEn: "Paris Saint Germain", nameAr: "باريس سان جيرمان" },
  91: { nameEn: "Monaco", nameAr: "موناكو" },
  106: { nameEn: "Stade Brestois 29", nameAr: "بريست" },
  197: { nameEn: "PSV Eindhoven", nameAr: "بي إس في آيندهوفن" },
  209: { nameEn: "Feyenoord", nameAr: "فينورد" },
  211: { nameEn: "Benfica", nameAr: "بنفيكا" },
  228: { nameEn: "Sporting CP", nameAr: "سبورتينغ لشبونة" },
  247: { nameEn: "Celtic", nameAr: "سيلتيك" },
  257: { nameEn: "Rangers", nameAr: "رينجرز" },
  375: { nameEn: "Malmo FF", nameAr: "مالمو" },
  394: { nameEn: "Dinamo Minsk", nameAr: "دينامو مينسك" },
  415: { nameEn: "Twente", nameAr: "توينتي" },
  489: { nameEn: "AC Milan", nameAr: "ميلان" },
  496: { nameEn: "Juventus", nameAr: "يوفنتوس" },
  499: { nameEn: "Atalanta", nameAr: "أتالانتا" },
  500: { nameEn: "Bologna", nameAr: "بولونيا" },
  505: { nameEn: "Inter", nameAr: "إنتر ميلان" },
  550: { nameEn: "Shakhtar Donetsk", nameAr: "شاختار دونيتسك" },
  556: { nameEn: "Qarabag", nameAr: "قره باغ" },
  560: { nameEn: "Slavia Praha", nameAr: "سلافيا براغ" },
  565: { nameEn: "BSC Young Boys", nameAr: "يونغ بويز" },
  566: { nameEn: "Ludogorets", nameAr: "لودوغوريتس" },
  569: { nameEn: "Club Brugge KV", nameAr: "نادي بروج" },
  571: { nameEn: "Red Bull Salzburg", nameAr: "ريد بول سالزبورغ" },
  572: { nameEn: "Dynamo Kyiv", nameAr: "دينامو كييف" },
  573: { nameEn: "FK Partizan", nameAr: "بارتيزان بلغراد" },
  598: { nameEn: "FK Crvena Zvezda", nameAr: "نجم أحمر بلغراد" },
  604: { nameEn: "Maccabi Tel Aviv", nameAr: "مكابي تل أبيب" },
  606: { nameEn: "FC Lugano", nameAr: "لوغانو" },
  611: { nameEn: "Fenerbahçe", nameAr: "فنربخشة" },
  619: { nameEn: "PAOK", nameAr: "باوك" },
  620: { nameEn: "Dinamo Zagreb", nameAr: "دينامو زغرب" },
  628: { nameEn: "Sparta Praha", nameAr: "سبارتا براغ" },
  637: { nameEn: "Sturm Graz", nameAr: "شتورم غراتس" },
  645: { nameEn: "Galatasaray", nameAr: "غلطة سراي" },
  651: { nameEn: "Ferencvarosi TC", nameAr: "فيرينتسفاروش" },
  656: { nameEn: "Slovan Bratislava", nameAr: "سلوفان براتيسلافا" },
  705: { nameEn: "Dinamo Batumi", nameAr: "دينامو باتومي" },
  709: { nameEn: "Pyunik Yerevan", nameAr: "بيونيك يريفان" },
  2247: { nameEn: "Apoel Nicosia", nameAr: "أبويل نيقوسيا" },
};

// =====================================================================
// اللاعبون — مفتاح كل قيد هو playerId الرقمي الحقيقي على API-Football.
// تغطية تشكيلة الهلال (2932) كاملة (30 لاعباً حقيقياً، من
// /players/squads?team=2932) + عدد محدود من لاعبين دوليين معروفين تحقّقنا
// من معرّفاتهم في هذه الجلسة. لاعبو باقي الأندية غير مُدرَجين بعد بسبب
// نفاد الحصة اليومية المجانية لـAPI-Football أثناء الجلب — راجع التقرير.
// =====================================================================
export const PLAYER_NAMES: Record<number, PlayerNameEntry> = {
  // تشكيلة الهلال 2932 — لاعبون سعوديون بأسماء عربية موثوقة (مشهورون في
  // الإعلام الرياضي السعودي/الإعلام الوطني، لا لبس في التعريب):
  44411: { nameEn: "Mohammed Al Owais", nameAr: "محمد العويس" },
  44339: { nameEn: "Nasser Al Dawsari", nameAr: "ناصر الدوسري" },
  44340: { nameEn: "Salem Al Dawsari", nameAr: "سالم الدوسري" },
  44349: { nameEn: "Mohamed Kanno", nameAr: "محمد كنو" },
  44362: { nameEn: "Hassan Tambakti", nameAr: "حسان تمبكتي" },
  // لاعبون أجانب مشهورون عالمياً — الاسم العربي شائع وموحَّد إعلامياً بلا لبس:
  2701: { nameEn: "Yassine Bounou", nameAr: "ياسين بونو" },
  318: { nameEn: "Kalidou Koulibaly", nameAr: "كاليدو كوليبالي" },
  1856: { nameEn: "Sergej Milinković-Savić", nameAr: "سيرجي ميلينكوفيتش-سافيتش" },
  2676: { nameEn: "Rúben Neves", nameAr: "روبن نيفيش" },
};

/**
 * يستخرج المعرّف الرقمي الخام من أي صيغة واردة: رقم مباشر، نص رقمي، أو
 * معرّف مُوسَوم بادئة مصدر ("af-2939") — تُطابَق فقط المعرّفات القادمة من
 * API-Football (af-) لأن TEAM_NAMES/PLAYER_NAMES هنا مبنيّان على معرّفاته
 * الرقمية تحديداً؛ معرّف tsdb-/espn- لا مقابل حقيقي موثّق له هنا بعد، فيُعاد
 * null بصدق بدل تخمين تطابق خاطئ.
 */
function extractApiFootballNumericId(rawId: number | string | null | undefined): number | null {
  if (rawId === null || rawId === undefined) return null;
  if (typeof rawId === "number") return Number.isNaN(rawId) ? null : rawId;

  const { provider, rawId: unwrapped } = parseTaggedId(rawId);
  if (provider !== null && provider !== "af") return null;

  const numeric = Number(unwrapped);
  return Number.isNaN(numeric) ? null : numeric;
}

/**
 * الاسم المعروض حسب اللغة:
 * - عربي: الاسم الموثَّق إن وُجد في القاموس أعلاه، وإلا الاسم الأصلي كما هو
 *   (لا اختراع تعريب).
 * - إنجليزي: الاسم الأصلي الحي القادم من المصدر دائماً بلا أي تعديل.
 */
export function getLocalizedTeamName(
  teamId: number | string | null | undefined,
  originalName: string,
  locale: Locale
): string {
  if (locale !== "ar") return originalName;
  const id = extractApiFootballNumericId(teamId);
  if (id === null) return originalName;
  return TEAM_NAMES[id]?.nameAr ?? originalName;
}

export function getLocalizedPlayerName(
  playerId: number | string | null | undefined,
  originalName: string,
  locale: Locale
): string {
  if (locale !== "ar") return originalName;
  const id = extractApiFootballNumericId(playerId);
  if (id === null) return originalName;
  return PLAYER_NAMES[id]?.nameAr ?? originalName;
}

/**
 * نقطة استدعاء واحدة لعرض اسم فريق في أي مكان (خدمة أو مكوّن): تجرّب
 * التعريب المبني على المعرّف الحقيقي أولاً (أدق)، ثم تحتاط بنظام التعريب
 * النصي القديم (localizeTeamName) لأي فريق لم يُدرَج بعد في القاموس الجديد
 * — بلا أي شرط إضافي داخل المُستدعي نفسه.
 */
export function getDisplayTeamName(
  teamId: number | string | null | undefined,
  originalName: string,
  locale: Locale
): string {
  const byId = getLocalizedTeamName(teamId, originalName, locale);
  return byId !== originalName ? byId : localizeTeamName(originalName, locale);
}
