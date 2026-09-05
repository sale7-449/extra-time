/**
 * إشارة إضافية اختيارية فقط (ليست حاسمة لدرجة الثقة) — هل يذكر عنوان الفيديو
 * اسم البطولة التي تنتمي إليها المباراة؟ مفاتيح هذا القاموس هي نفسها معرّف
 * البطولة الموحَّد (canonicalCompetitionId من lib/providers/football/ids.ts)
 * كي تُقارَن مباراة من أي مصدر (af-/tsdb-/espn-) دون تعديل هنا.
 */
export const COMPETITION_NAME_HINTS: Record<string, string[]> = {
  "307": ["saudi pro league", "roshn", "دوري روشن", "الدوري السعودي"],
  "39": ["premier league", "الدوري الإنجليزي"],
  "140": ["la liga", "الدوري الإسباني"],
  "78": ["bundesliga", "البوندسليغا", "الدوري الألماني"],
  "2": ["champions league", "دوري أبطال أوروبا", "أبطال أوروبا"],
  "17": ["afc champions league", "دوري أبطال آسيا"],
};
