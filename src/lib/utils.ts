import { messages, type Locale } from "@/lib/i18n/messages";

/** توقيت الرياض — المنطقة الزمنية المرجعية لتجميع مباريات الأسبوع حسب
 * اليوم، بمعزل تماماً عن توقيت تشغيل خادم Vercel نفسه (غالباً UTC) أو توقيت
 * متصفح الزائر — نفس اليوم التقويمي لكل الزوار بلا استثناء. */
const DISPLAY_TZ = "Asia/Riyadh";

/** مفتاح اليوم التقويمي (YYYY-MM-DD) بتوقيت الرياض — أساس تجميع مباريات
 * الأسبوع، لا مقارنة تواريخ خام قد تختلف بفارق ساعات المنطقة الزمنية. */
export function dayKeyInDisplayTz(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: DISPLAY_TZ });
}

/** عنوان يوم مباريات الأسبوع: "اليوم — الخميس ١٧ سبتمبر" لأول يوم، "غداً —
 * ..." لليوم التالي، واسم اليوم والتاريخ فقط لما بعدهما — كله بتوقيت الرياض. */
export function formatWeekDayHeading(iso: string, locale: Locale, todayLabel: string, tomorrowLabel: string): string {
  const key = dayKeyInDisplayTz(iso);
  const todayKey = dayKeyInDisplayTz(new Date().toISOString());
  const tomorrowKey = dayKeyInDisplayTz(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

  const weekdayDate = new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    timeZone: DISPLAY_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (key === todayKey) return `${todayLabel} — ${weekdayDate}`;
  if (key === tomorrowKey) return `${tomorrowLabel} — ${weekdayDate}`;
  return weekdayDate;
}

/** وقت الانطلاق بتوقيت الرياض دائماً — بلا اعتماد على منطقة الخادم (UTC) ولا
 * منطقة جهاز الزائر، فيتطابق ناتج الخادم والعميل حرفياً (بلا hydration
 * mismatch) ويرى كل الزوار نفس الوقت. hourCycle h23 بدل hour12:false لأن
 * بعض المحركات تُخرج "24:30" لمنتصف الليل مع الثانية. */
export function formatKickoffTime(iso: string, locale: Locale = "ar"): string {
  return new Date(iso).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: DISPLAY_TZ,
  });
}

/** تاريخ يوم/شهر بتوقيت الرياض وتقويم ميلادي صريح — نفس ضمانة التطابق بين
 * الخادم والعميل (تقويم ar-SA الافتراضي يختلف بين إصدارات ICU/المتصفحات). */
export function formatMatchDate(iso: string, locale: Locale = "ar"): string {
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    day: "numeric",
    month: "long",
    calendar: "gregory",
    timeZone: DISPLAY_TZ,
  });
}

/** الوقت النسبي ("قبل 12 دقيقة") يعتمد على Date.now() فلا يجوز أن يُرسَم على
 * الخادم ثم يُعاد رسمه على العميل بقيمة مختلفة — في مكوّنات العميل استخدم
 * <RelativeTime> (components/shared/RelativeTime.tsx) لا هذه الدالة مباشرة. */
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
