import type { Match, MediaItem, MediaCategory } from "@/lib/types";
import { textMentionsTeam } from "./team-aliases";
import { isHighlightTypeContent, isExtendedHighlightContent, isGoalContent } from "./classify";
import { canonicalCompetitionId } from "@/lib/providers/football/ids";
import { COMPETITION_NAME_HINTS } from "./competition-hints";

export type MatchMediaConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface MatchMediaResult {
  mediaId: string;
  matchId: string;
  confidence: MatchMediaConfidence;
  category: MediaCategory;
  reasons: string[];
}

export interface MatchedMedia {
  item: MediaItem;
  result: MatchMediaResult;
}

// نافذة زمنية معقولة لنشر فيديو "عن" مباراة بعينها: من ساعتين قبل الانطلاق
// (تغطية/بث مباشر مبكر نادراً ما يُصنَّف كملخص، لكن هامش أمان بسيط) حتى 5
// أيام بعدها (تغطي Highlights العادية وExtended Highlights المتأخرة قليلاً).
// نافذة أوسع تخاطر بربط فيديو لمباراة لاحقة بين نفس الفريقين خطأً.
const DATE_WINDOW_BEFORE_MS = 2 * 3_600_000;
const DATE_WINDOW_AFTER_MS = 5 * 86_400_000;

function scoreAppearsInText(text: string, homeScore: number, awayScore: number): boolean {
  const pairs = [...text.matchAll(/(\d{1,2})\s*[-–:]\s*(\d{1,2})/g)];
  return pairs.some(([, a, b]) => {
    const n1 = Number(a);
    const n2 = Number(b);
    return (n1 === homeScore && n2 === awayScore) || (n1 === awayScore && n2 === homeScore);
  });
}

/**
 * يقيّم فيديو واحد مقابل مباراة واحدة — كل إشارة (فريق/تاريخ/نتيجة/قناة
 * رسمية/كلمة "ملخص") محسوبة من بيانات حقيقية فقط، بلا أي تخمين. راجع
 * findMatchMedia أدناه لقواعد الثقة (HIGH/MEDIUM/LOW) المبنية على هذه
 * الإشارات مجتمعة.
 */
function evaluateOne(match: Match, item: MediaItem): MatchMediaResult {
  const text = `${item.title} ${item.description ?? ""}`;
  const reasons: string[] = [];

  const homeTeamMatch = textMentionsTeam(text, match.homeTeam.name);
  const awayTeamMatch = textMentionsTeam(text, match.awayTeam.name);
  if (homeTeamMatch) reasons.push("home_team_match");
  if (awayTeamMatch) reasons.push("away_team_match");

  const kickoffMs = +new Date(match.kickoff);
  const publishedMs = +new Date(item.publishedAt);
  const dateMatch = publishedMs >= kickoffMs - DATE_WINDOW_BEFORE_MS && publishedMs <= kickoffMs + DATE_WINDOW_AFTER_MS;
  if (dateMatch) reasons.push("date_match");

  const hasFinalScore = match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null;
  const scoreMatch = hasFinalScore && scoreAppearsInText(text, match.homeScore as number, match.awayScore as number);
  if (scoreMatch) reasons.push("score_match");

  const highlightKeywordMatch = isHighlightTypeContent(item.title, item.description ?? "");
  if (highlightKeywordMatch) reasons.push("highlight_keyword_match");

  const officialChannel = item.isOfficialSource !== false;
  if (officialChannel) reasons.push("official_channel");

  const league = canonicalCompetitionId(match.competitionId);
  const hints = league ? COMPETITION_NAME_HINTS[league] : undefined;
  const competitionMatch = hints?.some((hint) => text.toLowerCase().includes(hint.toLowerCase())) ?? false;
  if (competitionMatch) reasons.push("competition_match");

  // تصنيف مخصَّص لسياق المباراة (وليس classifyMedia العام دائماً — فيديو
  // "أهداف" من قناة نادٍ قد يُصنَّف OFFICIAL_CLUB افتراضياً هناك، لكنه هنا
  // GOAL بثقة لأننا نعرف بالفعل أنه يخصّ مباراة محدَّدة).
  const category: MediaCategory = isExtendedHighlightContent(item.title, item.description ?? "")
    ? "EXTENDED_HIGHLIGHT"
    : isGoalContent(item.title, item.description ?? "")
      ? "GOAL"
      : item.category;

  let confidence: MatchMediaConfidence = "LOW";
  if (homeTeamMatch && awayTeamMatch && dateMatch && officialChannel && (scoreMatch || highlightKeywordMatch)) {
    confidence = "HIGH";
  } else if (homeTeamMatch && awayTeamMatch && dateMatch && highlightKeywordMatch) {
    confidence = "MEDIUM";
  }

  return { mediaId: item.id, matchId: match.id, confidence, category, reasons };
}

// ترتيب العرض داخل صفحة المباراة — ملخص المباراة أولاً (الأشمل)، ثم الأهداف
// المفردة، ثم Extended Highlights، ثم محتوى رسمي عام، ثم مهارات/مقابلات.
// لا يتغلب الأحدث زمنياً على هذا الترتيب — فقط يفصل بين عناصر بنفس الأولوية.
const CATEGORY_PRIORITY: Record<MediaCategory, number> = {
  HIGHLIGHT: 1,
  GOAL: 2,
  EXTENDED_HIGHLIGHT: 3,
  OFFICIAL_CLUB: 4,
  OFFICIAL_LEAGUE: 4,
  NATIONAL_TEAM: 4,
  SKILLS: 5,
  INTERVIEW: 5,
  PRESS_CONFERENCE: 5,
  OTHER: 6,
};

/**
 * يعيد فقط الفيديوهات التي وصلت لحدّ الثقة الآمن (HIGH أو MEDIUM افتراضياً)
 * — LOW لا يظهر أبداً كفيديو مرتبط بالمباراة. [] صريحة إن لم يوجد أي فيديو
 * موثوق، بدل اختلاق نتيجة أو عرض أول فيديو مطابق اسمياً فقط.
 */
export function findMatchMedia(
  match: Match,
  pool: MediaItem[],
  { minConfidence = "MEDIUM" as MatchMediaConfidence, limit = 6 }: { minConfidence?: MatchMediaConfidence; limit?: number } = {}
): MatchedMedia[] {
  const acceptable: MatchMediaConfidence[] = minConfidence === "HIGH" ? ["HIGH"] : ["HIGH", "MEDIUM"];

  return pool
    .map((item) => ({ item, result: evaluateOne(match, item) }))
    .filter(({ result }) => acceptable.includes(result.confidence))
    .sort((a, b) => {
      const priorityDiff = CATEGORY_PRIORITY[a.result.category] - CATEGORY_PRIORITY[b.result.category];
      if (priorityDiff !== 0) return priorityDiff;
      return +new Date(b.item.publishedAt) - +new Date(a.item.publishedAt);
    })
    .slice(0, limit);
}
