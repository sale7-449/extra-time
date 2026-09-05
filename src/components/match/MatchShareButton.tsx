"use client";

import { useState } from "react";
import type { Match } from "@/lib/types";
import { ShareIcon } from "@/components/icons";
import { useSnapchatShare } from "@/lib/providers/snapchat/useSnapchatShare";
import { cx } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function MatchShareButton({ match }: { match: Match }) {
  const { status, message, share } = useSnapchatShare();
  const { t } = useLocale();
  // Web Share API غير مدعومة على أغلب متصفحات سطح المكتب — بدل زر يظهر
  // دائماً ثم يعرض "غير متاح" عند كل نقرة هناك (يبدو شكلياً)، لا يُعرض الزر
  // إطلاقاً إن كان الدعم غائباً فعلياً. نفس نمط StoryModal.tsx (Phase 3.3):
  // فحص جاهزية المتصفح عبر lazy useState initializer — يعمل فقط بعد mount
  // على العميل، بلا خطر hydration mismatch (الزر لا يُعرض من الأساس قبل ذلك).
  const [isAvailable] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");

  if (!isAvailable) return null;

  function handleShare() {
    const text =
      match.status === "SCHEDULED"
        ? `${match.homeTeam.name} × ${match.awayTeam.name} ${t.match.shareSuffix}`
        : `${match.homeTeam.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.name} ${t.match.shareSuffix}`;

    share("RESULT", {
      title: "EXTRA TIME",
      text,
      url: typeof window !== "undefined" ? window.location.href : "",
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleShare}
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-sm)] border border-border bg-surface text-sm font-bold hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ShareIcon className="w-4 h-4" />
        {status === "loading" ? t.match.sharing : t.match.shareToSnap}
      </button>
      {message && <p className={cx("text-xs", status === "success" ? "text-primary" : "text-muted-dim")}>{message}</p>}
    </div>
  );
}
