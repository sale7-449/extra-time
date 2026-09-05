import { MockSnapchatProvider } from "./mock-provider";
import { WebShareProvider } from "./web-share-provider";
import type { SnapchatProvider } from "./types";

const mock = new MockSnapchatProvider();
const webShare = new WebShareProvider();

/** يُستدعى من مكوّنات "use client" فقط. على السيرفر (بلا navigator) يعود
 * دائماً MockSnapchatProvider الآمن. */
export function getSnapchatProvider(): SnapchatProvider {
  if (typeof window === "undefined") return mock;
  return webShare.isAvailable() ? webShare : mock;
}

export type { SnapchatProvider, ShareContent, ShareStatus, SnapchatShareKind } from "./types";
