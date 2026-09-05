/**
 * يحوّل أي تسمية مركز نصية قادمة من أي مصدر (API-Football يُعيد رمزاً واحداً
 * G/D/M/F مباشرة، لكن TheSportsDB وESPN يُعيدان نصوصاً وصفية كاملة مثل
 * "Central Midfield"/"Right Winger"/"Centre-Back") إلى رمز موحّد G/D/M/F —
 * بدونه يفشل تجميع التشكيلة على الملعب حسب الصف (حارس/دفاع/وسط/هجوم) لأي
 * مصدر لا يُعيد الرمز المختصر مباشرة، ويظهر الملعب شبه فارغ.
 */
export function normalizePositionCode(raw: string | undefined | null): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/^[GDMF]$/i.test(trimmed)) return trimmed.toUpperCase();

  const lower = trimmed.toLowerCase();
  // ESPN يُعيد "SUB" لكل لاعب احتياطي بلا مركزه الحقيقي إطلاقاً — لا يوجد
  // ما نُخمّنه هنا، فنُعيد فارغاً بصدق بدل اختراع حرف "S" لا معنى له.
  if (lower === "sub" || lower === "substitute") return "";
  if (/keeper|^gk$/.test(lower)) return "G";
  // رموز مركّبة من ESPN مثل CD-L/CD-R (Center Defender Left/Right) تحتاج
  // مطابقة البادئة، لا التطابق التام فقط.
  if (/back|defen|^cb$|^cd(-|$)|^lb$|^rb$|^lwb$|^rwb$|^sw$/.test(lower)) return "D";
  // ESPN يُصدر رموزاً باتجاه يسار/يمين لمراكز الوسط والهجوم المركزية أيضاً
  // (مثال حقيقي رُصِد: "CM-L"/"CM-R"/"CF-L"/"CF-R") لا رمزاً ثابتاً واحداً —
  // كان يتوقّف عندها ضبط "cd(-|$)" فقط، فتسقط هذه اللاعبين بصمت من الملعب
  // (تُصنَّف "C" غير المعروفة، راجع FormationPitch.tsx).
  if (/midfield|^c?dm(-|$)|^c?am(-|$)|^cm(-|$)|^lm$|^rm$/.test(lower)) return "M";
  if (/forward|striker|wing|^st(-|$)|^cf(-|$)|^lw$|^rw$|^ss(-|$)/.test(lower)) return "F";

  return trimmed.charAt(0).toUpperCase();
}
