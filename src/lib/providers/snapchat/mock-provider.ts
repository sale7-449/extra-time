import type { ShareContent, ShareStatus, SnapchatProvider, SnapchatShareKind } from "./types";

/** الافتراضي الآمن أثناء التصيير على السيرفر (SSR) أو عند غياب أي آلية
 * مشاركة مدعومة على المتصفح الحالي. لا يدّعي نجاحاً أبداً. */
export class MockSnapchatProvider implements SnapchatProvider {
  isAvailable(): boolean {
    return false;
  }

  async share(kind: SnapchatShareKind, content: ShareContent): Promise<ShareStatus> {
    void kind;
    void content;
    return "unavailable";
  }
}
