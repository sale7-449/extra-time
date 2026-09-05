import type { MatchEvent, MediaItem } from "@/lib/types";
import type { MatchedMedia } from "./match-media-matcher";

/**
 * يربط هدفاً واحداً بفيديو حقيقي مخصَّص له تحديداً — لا ملخص المباراة
 * الكامل، ولا فيديو عام لنفس الفريق/البطولة. يعمل فوق مجمّع الفيديوهات
 * المُتحقَّق منه أصلاً (HIGH/MEDIUM فقط، كلا الفريقين مذكوران، ضمن نافذة
 * زمنية معقولة — راجع match-media-matcher.ts) بإضافة إشارة ثقة أخيرة: هل
 * اسم الهدّاف نفسه مذكور في عنوان/وصف الفيديو؟ بلا هذا الدليل، لا رابط.
 */

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** آخر مقطع من الاسم فقط — أكثر ثباتاً عبر مصادر مختلفة (لقب الشهرة يظهر
 * غالباً في عناوين الفيديوهات، لا الاسم الكامل الرسمي). مرفوض إن كان قصيراً
 * جداً (أقل من 3 أحرف) تجنّباً لمطابقات عرضية كاذبة. */
function lastNameToken(fullName: string): string | null {
  const parts = normalizeName(fullName).split(" ").filter(Boolean);
  const last = parts[parts.length - 1];
  return last && last.length >= 3 ? last : null;
}

function textMentionsPlayer(text: string, playerName: string): boolean {
  const token = lastNameToken(playerName);
  if (!token) return false;
  const pattern = new RegExp(`\\b${token}\\b`, "i");
  return pattern.test(normalizeName(text));
}

/**
 * فيديو GOAL مصنَّف تحديداً (لا Highlight/Extended Highlight عام — قد
 * يحتوي الهدف فعلاً لكنه ليس "فيديو هذا الهدف" بذاته) يذكر اسم الهادف نفسه.
 * يُعيد null بصدق إن لم يوجد دليل كافٍ — لا تخمين، لا أول نتيجة عشوائية.
 */
export function findGoalVideo(goal: MatchEvent, matchedMedia: MatchedMedia[]): MediaItem | null {
  if (goal.type !== "GOAL" || goal.playerName === "—") return null;

  const candidate = matchedMedia.find(({ item, result }) => {
    if (result.category !== "GOAL") return false;
    const text = `${item.title} ${item.description ?? ""}`;
    return textMentionsPlayer(text, goal.playerName);
  });

  return candidate?.item ?? null;
}
