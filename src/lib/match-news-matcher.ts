import type { Match, NewsArticle } from "@/lib/types";
import { textMentionsTeam } from "@/lib/providers/media/team-aliases";

// نفس فلسفة match-media-matcher.ts بالضبط، لكن أبسط: خبر "متعلق بالمباراة"
// فقط إذا ذكر عنوانه/ملخصه كلا الفريقين معاً (لا فريق واحد فقط — قد يكون
// خبراً عاماً عن ذلك الفريق بلا أي علاقة بهذه المباراة تحديداً) ونُشر ضمن
// نافذة زمنية معقولة حول موعدها. لا حاجة لثلاث درجات ثقة هنا؛ "الفريقان معاً"
// إشارة قوية بما يكفي بمفردها لخبر (بخلاف فيديو قد يكون عن فريق واحد فقط
// بمشروعية — ملخص أهداف مثلاً).
const DATE_WINDOW_BEFORE_MS = 24 * 3_600_000;
const DATE_WINDOW_AFTER_MS = 5 * 86_400_000;

// إذا واجه نفس الفريقان بعضهما أكثر من مرة (ذهاب/إياب، دوري وكأس...)، نافذة
// التاريخ وحدها قد لا تكفي للتفريق إن كانت المباراتان متقاربتين. عند ذكر
// نتيجة رقمية صريحة في نص الخبر لمباراة منتهية، يجب أن تطابق النتيجة
// الفعلية فعلياً — نتيجة مختلفة صريحة تعني بقوة أن الخبر عن مباراة أخرى
// بينهما، فيُرفض حتى لو كان ضمن النافذة الزمنية.
function scoreAppearsInText(text: string, homeScore: number, awayScore: number): boolean {
  const pairs = [...text.matchAll(/(\d{1,2})\s*[-–:]\s*(\d{1,2})/g)];
  return pairs.some(([, a, b]) => {
    const n1 = Number(a);
    const n2 = Number(b);
    return (n1 === homeScore && n2 === awayScore) || (n1 === awayScore && n2 === homeScore);
  });
}

function hasConflictingScore(text: string, match: Match): boolean {
  if (match.status !== "FINISHED" || match.homeScore === null || match.awayScore === null) return false;
  const pairs = [...text.matchAll(/(\d{1,2})\s*[-–:]\s*(\d{1,2})/g)];
  if (pairs.length === 0) return false;
  return !scoreAppearsInText(text, match.homeScore, match.awayScore);
}

/**
 * أخبار حقيقية متعلقة بمباراة بعينها فقط — [] صريحة إن لم يوجد خبر بثقة
 * كافية، لا خبر عام مُلصَق بالمباراة لمجرد ذكره فريقاً واحداً منها. رفض
 * إضافي إن ذكر النص نتيجة رقمية صريحة تخالف النتيجة الفعلية — إشارة قوية
 * على أن الخبر عن مواجهة أخرى بين نفس الفريقين، لا هذه المباراة.
 */
export function findMatchNews(match: Match, pool: NewsArticle[], limit = 3): NewsArticle[] {
  const kickoffMs = +new Date(match.kickoff);

  return pool
    .filter((article) => {
      const text = `${article.title} ${article.summary}`;
      if (!textMentionsTeam(text, match.homeTeam.name) || !textMentionsTeam(text, match.awayTeam.name)) return false;
      if (hasConflictingScore(text, match)) return false;

      const publishedMs = +new Date(article.publishedAt);
      return publishedMs >= kickoffMs - DATE_WINDOW_BEFORE_MS && publishedMs <= kickoffMs + DATE_WINDOW_AFTER_MS;
    })
    .slice(0, limit);
}
