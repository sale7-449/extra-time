"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/types";
import { VideoModal } from "@/components/media/VideoModal";
import { PlayIcon } from "@/components/icons";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** زر "مشاهدة فيديو الهدف" — يفتح نفس VideoModal المستخدَم لفيديوهات
 * المباراة العامة (لا مشغِّل مختلف، لا تعقيد إضافي). item يصل جاهزاً ومُتحقَّقاً
 * منه أصلاً (HIGH/MEDIUM + اسم اللاعب مذكور فعلاً — راجع goal-video-matcher.ts)،
 * هذا المكوّن يعرضه فقط، لا يقرّر الثقة بنفسه. */
export function GoalVideoButton({ item }: { item: MediaItem }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded"
      >
        <PlayIcon className="w-3 h-3" />
        {t.videos.goalVideoLink}
      </button>
      <VideoModal open={open} onClose={() => setOpen(false)} item={item} />
    </>
  );
}
