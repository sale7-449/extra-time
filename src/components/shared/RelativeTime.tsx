"use client";

import { useSyncExternalStore } from "react";
import type { Locale } from "@/lib/i18n/messages";
import { formatMatchDate, formatRelativeTime } from "@/lib/utils";

const subscribe = () => () => {};

/**
 * وقت نسبي ("قبل 12 دقيقة") بلا hydration mismatch: القيمة تعتمد على الوقت
 * الحالي فلا يمكن أن تتطابق بين رسم الخادم ورسم العميل. الرسم الأول (خادماً
 * وعند الـhydration على العميل) يستخدم تاريخاً مطلقاً حتمياً بتوقيت الرياض،
 * وبعد اكتمال الـhydration مباشرة يُستبدَل بالوقت النسبي الفعلي —
 * useSyncExternalStore هو الآلية الرسمية لذلك (snapshot الخادم ≠ snapshot
 * العميل بلا تحذير)، لا suppressHydrationWarning.
 */
export function RelativeTime({ iso, locale }: { iso: string; locale: Locale }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  return <time dateTime={iso}>{hydrated ? formatRelativeTime(iso, locale) : formatMatchDate(iso, locale)}</time>;
}
