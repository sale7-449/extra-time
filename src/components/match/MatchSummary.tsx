"use client";

import type { Match } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatEventMinute } from "@/lib/match-events";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * ملخص نصي حقيقي مبني حصراً من match.events + النتيجة — لا اختراع، لا
 * تخمين. يظهر فقط لمباراة FINISHED فعلاً؛ يبقى غائباً تماماً لمباراة لم
 * تُلعَب/جارية (لا "ملخص" منطقياً لحدث لم يكتمل بعد، تماماً كقسم الفيديو).
 *
 * فحص الاكتمال: عدد أحداث GOAL يجب أن يطابق مجموع النتيجة تماماً — أي
 * اختلاف يعني أن أحداث المصدر ناقصة، فنعرض حالة صريحة بدل ملخص قد يكون
 * خاطئاً أو منقوصاً (نفس مبدأ "أخفِ بدل التخمين" في بقية المشروع).
 */
export function MatchSummary({ match }: { match: Match }) {
  const { t, locale } = useLocale();

  if (match.status !== "FINISHED" || match.homeScore === null || match.awayScore === null) return null;
  if (match.events.length === 0) return null;

  const goals = match.events.filter((e) => e.type === "GOAL").sort((a, b) => a.minute - b.minute);
  const expectedGoals = match.homeScore + match.awayScore;

  if (goals.length !== expectedGoals) {
    return (
      <div>
        <h4 className="text-sm font-extrabold mb-3">{t.match.summaryTitle}</h4>
        <EmptyState title={t.match.summaryUnavailable} />
      </div>
    );
  }

  const yellowCount = match.events.filter((e) => e.type === "YELLOW_CARD").length;
  // البطاقة الحمراء نادرة ومهمة — تُذكَر بالاسم والدقيقة (حدث رئيسي فعلاً)،
  // بخلاف الصفراء (كثيرة العدد عادة، تبقى إجمالياً فقط تجنّباً لقائمة مزدحمة).
  const redCards = match.events.filter((e) => e.type === "RED_CARD").sort((a, b) => a.minute - b.minute);
  const subsCount = match.events.filter((e) => e.type === "SUBSTITUTION").length;

  const goalsLine = goals
    .map((g) => `${g.playerName}${g.isOwnGoal ? ` (${t.match.ownGoalShort})` : ""} ${formatEventMinute(g)}`)
    .join(locale === "ar" ? "، " : ", ");

  const cardsParts: string[] = [];
  if (yellowCount > 0) cardsParts.push(`${yellowCount} ${t.match.summaryYellow}`);
  if (redCards.length > 0) cardsParts.push(`${redCards.length} ${t.match.summaryRed}`);

  const sentOffLine = redCards.map((r) => `${r.playerName} ${formatEventMinute(r)}`).join(locale === "ar" ? "، " : ", ");

  return (
    <div>
      <h4 className="text-sm font-extrabold mb-3">{t.match.summaryTitle}</h4>
      <div className="space-y-2 text-sm leading-relaxed text-ink rounded-[var(--radius-sm)] bg-surface-2 border border-border p-4">
        <p>
          <span className="font-bold text-muted-dim">{t.match.summaryFinalResult}: </span>
          <span dir="ltr" className="tabular font-extrabold">
            {match.homeTeam.name} {match.homeScore}-{match.awayScore} {match.awayTeam.name}
          </span>
        </p>
        {/* لا يُعرَض السطر إطلاقاً لمباراة 0-0 حقيقية — "الأهداف: " بلا شيء
            بعدها كان يبدو ناقصاً/معطوباً بدل الإفصاح الصادق أن لا أهداف
            بالفعل (نتيجة "0-0" في السطر أعلاه تكفي لتوضيح ذلك). */}
        {goals.length > 0 && (
          <p>
            <span className="font-bold text-muted-dim">{t.match.summaryGoalsLabel}: </span>
            {goalsLine}
          </p>
        )}
        {cardsParts.length > 0 && (
          <p>
            <span className="font-bold text-muted-dim">{t.match.summaryCardsLabel}: </span>
            {cardsParts.join(locale === "ar" ? "، " : ", ")}
          </p>
        )}
        {redCards.length > 0 && (
          <p>
            <span className="font-bold text-warning">{t.match.summarySentOffLabel}: </span>
            {sentOffLine}
          </p>
        )}
        {subsCount > 0 && (
          <p>
            <span className="font-bold text-muted-dim">{t.match.summarySubsLabel}: </span>
            <span className="tabular">{subsCount}</span>
          </p>
        )}
      </div>
    </div>
  );
}
