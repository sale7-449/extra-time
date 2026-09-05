import { messages, type Locale } from "@/lib/i18n/messages";

export function formatKickoffTime(iso: string, locale: Locale = "ar"): string {
  return new Date(iso).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatRelativeTime(iso: string, locale: Locale = "ar"): string {
  const t = messages[locale].common;
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t.justNow;
  if (diffMin < 60) return locale === "ar" ? `${t.ago} ${diffMin} ${t.minutesAgo}` : `${diffMin}${t.minutesAgo} ${t.ago}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return locale === "ar" ? `${t.ago} ${diffHr} ${t.hoursAgo}` : `${diffHr}${t.hoursAgo} ${t.ago}`;
  const diffDay = Math.floor(diffHr / 24);
  return locale === "ar" ? `${t.ago} ${diffDay} ${t.daysAgo}` : `${diffDay}${t.daysAgo} ${t.ago}`;
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
