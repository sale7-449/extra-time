import type { ShareContent, ShareStatus, SnapchatProvider, SnapchatShareKind } from "./types";

/** يعتمد على Web Share API الأصلية للمتصفح — مدعومة على أغلب متصفحات
 * الجوال، وتُظهر سناب شات كخيار مشاركة حقيقي إن كان مثبَّتاً على الجهاز.
 * غير متاحة على أغلب متصفحات سطح المكتب حالياً — هذا مُعرَّف صراحةً عبر
 * isAvailable()، لا نتظاهر بخلاف ذلك. */
export class WebShareProvider implements SnapchatProvider {
  isAvailable(): boolean {
    return typeof navigator !== "undefined" && typeof navigator.share === "function";
  }

  async share(_kind: SnapchatShareKind, content: ShareContent): Promise<ShareStatus> {
    if (!this.isAvailable()) return "unavailable";

    try {
      await navigator.share({ title: content.title, text: content.text, url: content.url });
      return "success";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "idle"; // المستخدم أغلق نافذة المشاركة بنفسه — ليس خطأً
      }
      return "error";
    }
  }
}
