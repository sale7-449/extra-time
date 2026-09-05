import type { MatchEvent } from "@/lib/types";

/** قيمة رقمية قابلة للمقارنة تجمع الدقيقة الأساسية + الإضافية بترتيب زمني
 * صحيح (45+2 قبل 46، لا 452 قبل 46). مُشترَكة بين المخطط الزمني وقائمة
 * الهدافين كي لا يختلف منطق الترتيب بين مكانين. */
export function eventTimeValue(event: Pick<MatchEvent, "minute" | "extraMinute">): number {
  return event.minute * 1000 + (event.extraMinute ?? 0);
}

/** "45+2'" الصيغة الصحيحة للوقت الإضافي — وليس "452'". */
export function formatEventMinute(event: Pick<MatchEvent, "minute" | "extraMinute">): string {
  return `${event.minute}${event.extraMinute ? `+${event.extraMinute}` : ""}'`;
}
