"use client";

import { useCallback, useState } from "react";
import { getSnapchatProvider } from "./index";
import type { ShareContent, ShareStatus, SnapchatShareKind } from "./types";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function useSnapchatShare() {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const { t } = useLocale();

  const statusMessage: Record<ShareStatus, string | null> = {
    idle: null,
    loading: null,
    success: t.snapchat.successMsg,
    unavailable: t.snapchat.unavailableMsg,
    error: t.snapchat.errorMsg,
  };

  const share = useCallback(async (kind: SnapchatShareKind, content: ShareContent) => {
    setStatus("loading");
    const provider = getSnapchatProvider();
    const result = await provider.share(kind, content);
    setStatus(result);
  }, []);

  return { status, message: statusMessage[status], share };
}
