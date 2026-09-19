/**
 * تصنيف رابط وسائط حسب نوعه الفعلي (لا حسب الحقل الذي وُضع فيه). مصدر وحيد
 * تستخدمه معاينة Content Studio ومشغّل الفيديو العام (VideoModal) — كل نوع يُعالَج
 * بالعنصر الصحيح: يوتيوب → iframe تضمين رسمي، ملف فيديو (مرفوع أو رابط مباشر) →
 * <video>، أي شيء آخر → رابط يُفتَح خارجياً بدل iframe/فيديو مكسور صامت.
 */

/** معرّف فيديو يوتيوب من أي صيغة رابط شائعة (watch/youtu.be/shorts/embed). */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/^\/(shorts|embed)\/([^/?]+)/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

export type PreviewKind = "IMAGE" | "YOUTUBE" | "VIDEO_FILE" | "LINK";

const VIDEO_FILE_RE = /\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/i;
const IMAGE_FILE_RE = /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i;

/** يُحدَّد النوع من شكل القيمة الفعلية نفسها، لا من "kind" الحقل المُعلَن.
 * blob:/data: تأتي حصراً من رفع محلي نتحكّم بنوعه، فتُصنَّف حسب kind الحقل. */
export function detectPreviewKind(value: string, fieldKind: "IMAGE" | "VIDEO"): PreviewKind {
  if (value.startsWith("blob:") || value.startsWith("data:")) return fieldKind === "IMAGE" ? "IMAGE" : "VIDEO_FILE";
  if (extractYouTubeVideoId(value)) return "YOUTUBE";
  if (VIDEO_FILE_RE.test(value)) return "VIDEO_FILE";
  if (IMAGE_FILE_RE.test(value)) return "IMAGE";
  // امتداد غير معروف: حقل صورة يبقى صورة (شعارات كثيرة بلا امتداد ظاهر)، لكن حقل
  // فيديو بقيمة غير مؤكَّدة التشغيل يُعرَض كرابط — مشغّل مكسور صامت أسوأ.
  return fieldKind === "IMAGE" ? "IMAGE" : "LINK";
}

export type PlayerSource =
  | { kind: "YOUTUBE"; embedUrl: string }
  | { kind: "VIDEO_FILE"; src: string }
  | { kind: "LINK"; href: string };

/**
 * مصدر التشغيل الصحيح لعنصر فيديو. يوتيوب: صيغة embed الرسمية مع playsinline=1
 * (بدونه يفرض iPhone الشاشة الكاملة الأصلية) وautoplay=1 (النافذة تُفتح أصلاً
 * بلمسة المستخدم، فيبدأ التشغيل من اللمسة نفسها حيث تسمح السياسة، وإلا يعرض
 * اللاعب زر التشغيل) وrel=0.
 */
export function getPlayerSource(embedUrl: string | null | undefined, fallbackUrl?: string | null): PlayerSource | null {
  for (const candidate of [embedUrl, fallbackUrl]) {
    if (!candidate) continue;
    const id = extractYouTubeVideoId(candidate);
    if (id) return { kind: "YOUTUBE", embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}?playsinline=1&autoplay=1&rel=0` };
    if (/^https?:\/\//i.test(candidate) && VIDEO_FILE_RE.test(candidate)) return { kind: "VIDEO_FILE", src: candidate };
  }
  const link = [embedUrl, fallbackUrl].find((u): u is string => Boolean(u) && /^https?:\/\//i.test(u as string));
  return link ? { kind: "LINK", href: link } : null;
}
