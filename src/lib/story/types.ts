/**
 * Story = تمثيل بصري وسيط بين ContentItem الحقيقي وCanvas الفعلي — لا Canvas
 * هنا إطلاقاً، فقط بيانات جاهزة للرسم. أي حقل غائب من المصدر = undefined هنا
 * (لا قيمة افتراضية/بديلة أبداً)، والراسم يتجاهل أي حقل undefined تماماً
 * بدل رسم عنصر فارغ/مكسور مكانه.
 */
export type StoryTemplate = "MATCH_RESULT" | "GOAL" | "NEWS" | "VIDEO";

export interface StoryLayout {
  template: StoryTemplate;
  /** اتجاه النص الفعلي (من ContentItem.language الحقيقي، لا تخمين) — يحكم
   * محاذاة كل النصوص وترتيب عناصر التخطيط أفقياً. */
  dir: "rtl" | "ltr";
  /** النص الرئيسي — موجود دائماً (لا Layout بلا headline). */
  headline: string;
  subline?: string;
  competitionLabel?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamLogoUrl?: string | null;
  awayTeamLogoUrl?: string | null;
  /** نص نتيجة جاهز ("5-2") — يُبنى في طبقة التحويل حتى لا يقرّر الراسم نفسه
   * ترتيب الأرقام. */
  scoreText?: string;
  /** صورة مصغّرة رئيسية (خبر/فيديو/شعار فريق الهدف) — عنصر واحد فقط لكل Layout. */
  imageUrl?: string | null;
  /** فيديو: يُرسَم زر تشغيل فوق الصورة إن كان true. */
  isVideo?: boolean;
  sourceLabel?: string;
}
