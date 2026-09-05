import type { MediaCategory } from "@/lib/types";

export type ChannelKind = "CLUB" | "LEAGUE" | "NATIONAL_TEAM" | "COMPETITION";

// "Extended highlights" يحتوي فعلياً كلمة "highlights" — يجب فحصه أولاً
// وإلا صُنِّف خطأً كـHIGHLIGHT عادي. لا مقابل عربي شائع مميَّز لهذا المصطلح
// تحديداً في القنوات المفحوصة، فيبقى الفحص إنجليزياً فقط بثقة.
const EXTENDED_HIGHLIGHT_PATTERN = /extended highlights?/i;
const GOAL_PATTERN = /\b(all\s+)?goals?\b|هدف|أهداف/i;
const HIGHLIGHT_PATTERN = /highlights?|ملخص|ملخصات|أبرز اللقطات|resumen/i;
const SKILLS_PATTERN = /\bskills?\b|\btricks?\b|مهارات|لمسات فنية/i;
const INTERVIEW_PATTERN = /\binterview\b|لقاء خاص|حوار|تصريحات/i;
const PRESS_CONFERENCE_PATTERN = /press conference|مؤتمر صحفي|المؤتمر الصحفي/i;

/**
 * تصنيف نوع المحتوى من العنوان/الوصف الفعليين فقط — لا تخمين. عند غياب أي
 * كلمة دالة صريحة، يُستخدم نوع القناة نفسها (نادٍ/بطولة/منتخب) كتصنيف عام
 * بدل "OTHER" الفضفاض، لأن هوية القناة الناشرة معلومة حقيقية موثوقة أصلاً.
 */
export function classifyMedia(title: string, description: string, channelKind: ChannelKind): MediaCategory {
  const text = `${title} ${description}`;
  if (EXTENDED_HIGHLIGHT_PATTERN.test(text)) return "EXTENDED_HIGHLIGHT";
  if (GOAL_PATTERN.test(text)) return "GOAL";
  if (HIGHLIGHT_PATTERN.test(text)) return "HIGHLIGHT";
  if (SKILLS_PATTERN.test(text)) return "SKILLS";
  if (PRESS_CONFERENCE_PATTERN.test(text)) return "PRESS_CONFERENCE";
  if (INTERVIEW_PATTERN.test(text)) return "INTERVIEW";

  switch (channelKind) {
    case "CLUB":
      return "OFFICIAL_CLUB";
    case "LEAGUE":
    case "COMPETITION":
      return "OFFICIAL_LEAGUE";
    case "NATIONAL_TEAM":
      return "NATIONAL_TEAM";
    default:
      return "OTHER";
  }
}

// مُصدَّرة لإعادة استخدامها في match-media-matcher.ts — نفس منطق التصنيف
// بالضبط، بلا تكرار الأنماط في مكانين.
export function isExtendedHighlightContent(title: string, description: string): boolean {
  return EXTENDED_HIGHLIGHT_PATTERN.test(`${title} ${description}`);
}

export function isGoalContent(title: string, description: string): boolean {
  return GOAL_PATTERN.test(`${title} ${description}`);
}

/** أي كلمة دالة على "محتوى ملخص/أهداف مباراة" — إشارة ثقة أساسية في
 * match-media-matcher (وليست تصنيفاً نهائياً؛ راجع classifyMedia لذلك). */
export function isHighlightTypeContent(title: string, description: string): boolean {
  const text = `${title} ${description}`;
  return EXTENDED_HIGHLIGHT_PATTERN.test(text) || GOAL_PATTERN.test(text) || HIGHLIGHT_PATTERN.test(text);
}

const ARABIC_PATTERN = /[؀-ۿ]/;

export function detectLanguage(text: string): "ar" | "en" {
  return ARABIC_PATTERN.test(text) ? "ar" : "en";
}
