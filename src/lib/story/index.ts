import type { ContentItem } from "@/lib/providers/social/types";
import { buildStoryLayout } from "./buildStoryLayout";
import { renderStoryToCanvas, STORY_WIDTH, STORY_HEIGHT } from "./renderStoryCanvas";
import type { StoryLayout, StoryTemplate } from "./types";

/**
 * واجهة الاستخدام الكاملة لمولّد Story — الدالة الوحيدة التي يحتاجها أي
 * استدعاء لاحق (Share/Export button في المرحلة 3.3): ContentItem حقيقي +
 * canvas فارغ → إما رسم فعلي (true) أو رفض صادق (false) بلا أي رسم عند نقص
 * البيانات، بدل استثناء يحتاج معالجة من كل مستدعٍ.
 *
 * مستقل عن React بالكامل — canvas عنصر DOM عادي (ref.current من أي مكوّن،
 * أو عنصر مُنشأ يدوياً عبر document.createElement("canvas") بلا إدراجه في
 * الصفحة أصلاً، مفيد للتصدير الصامت لاحقاً).
 */
export async function generateStoryImage(
  item: ContentItem,
  canvas: HTMLCanvasElement,
  locale: "ar" | "en" = "ar"
): Promise<boolean> {
  const layout = buildStoryLayout(item, locale);
  if (!layout) return false;

  await renderStoryToCanvas(canvas, layout);
  return true;
}

export { buildStoryLayout, renderStoryToCanvas, STORY_WIDTH, STORY_HEIGHT };
export type { StoryLayout, StoryTemplate };
