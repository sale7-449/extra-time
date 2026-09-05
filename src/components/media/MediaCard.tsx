"use client";

import { useState } from "react";
import Image from "next/image";
import type { MediaItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PlayIcon } from "@/components/icons";
import { VideoModal } from "./VideoModal";
import { isAllowedImageHost } from "@/lib/image-hosts";

const categoryKey: Record<
  MediaItem["category"],
  "categoryGoal" | "categoryHighlight" | "categoryExtendedHighlight" | "categorySkills" | "categoryInterview" | "categoryPressConference" | "categoryOfficialClub" | "categoryOfficialLeague" | "categoryNationalTeam" | "categoryOther"
> = {
  GOAL: "categoryGoal",
  HIGHLIGHT: "categoryHighlight",
  EXTENDED_HIGHLIGHT: "categoryExtendedHighlight",
  SKILLS: "categorySkills",
  INTERVIEW: "categoryInterview",
  PRESS_CONFERENCE: "categoryPressConference",
  OFFICIAL_CLUB: "categoryOfficialClub",
  OFFICIAL_LEAGUE: "categoryOfficialLeague",
  NATIONAL_TEAM: "categoryNationalTeam",
  OTHER: "categoryOther",
};

// تمييز بصري بين أنواع الفيديو — لا تُعرَض كبطاقات متطابقة (خصوصاً حين يظهر
// ملخص مباراة وملخص أهداف معاً في نفس القسم). الألوان: الأهداف بلون مميَّز
// (كهرمان) عن الملخص/الملخص الموسّع (اللون الأساسي)، وبقية الأنواع بلون محايد.
const categoryEmoji: Record<MediaItem["category"], string> = {
  GOAL: "⚽",
  HIGHLIGHT: "🎬",
  EXTENDED_HIGHLIGHT: "▶️",
  SKILLS: "🤹",
  INTERVIEW: "🎙️",
  PRESS_CONFERENCE: "🎤",
  OFFICIAL_CLUB: "🏟️",
  OFFICIAL_LEAGUE: "🏆",
  NATIONAL_TEAM: "🏟️",
  OTHER: "📺",
};

const categoryBadgeClass: Record<MediaItem["category"], string> = {
  GOAL: "bg-warning text-ink",
  HIGHLIGHT: "bg-primary text-primary-ink",
  EXTENDED_HIGHLIGHT: "bg-primary text-primary-ink",
  SKILLS: "bg-surface-2 text-ink border border-border",
  INTERVIEW: "bg-surface-2 text-ink border border-border",
  PRESS_CONFERENCE: "bg-surface-2 text-ink border border-border",
  OFFICIAL_CLUB: "bg-surface-2 text-ink border border-border",
  OFFICIAL_LEAGUE: "bg-surface-2 text-ink border border-border",
  NATIONAL_TEAM: "bg-surface-2 text-ink border border-border",
  OTHER: "bg-surface-2 text-ink border border-border",
};

export function MediaCard({ item }: { item: MediaItem }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const categoryLabel = t.videos[categoryKey[item.category]];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full text-start overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface transition-colors hover:border-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="relative aspect-video overflow-hidden bg-surface-2">
          {item.thumbnailUrl && isAllowedImageHost(item.thumbnailUrl) && (
            <Image
              src={item.thumbnailUrl}
              alt={item.title}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
          <span className={`absolute top-3 start-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${categoryBadgeClass[item.category]}`}>
            {categoryEmoji[item.category]} {categoryLabel}
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
              {/* مثلث التشغيل لا يُعكَس مع RTL — اتفاق عالمي ثابت (يوتيوب/نتفليكس) بلا علاقة باتجاه النص */}
              <PlayIcon className="w-6 h-6 translate-x-0.5" />
            </span>
          </span>
          {/* مدة الفيديو — تُعرض فقط إن وفَّرها المصدر فعلياً (لا مزوّد حالي
              يملأها بعد، الحقل موجود بالنوع لجهوزية مستقبلية) — لا اختلاق. */}
          {item.duration && (
            <span dir="ltr" className="absolute bottom-2 end-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white tabular">
              {item.duration}
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-sm font-extrabold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <p suppressHydrationWarning className="mt-2 text-xs text-muted-dim">
            {item.source} · {formatRelativeTime(item.publishedAt, locale)}
          </p>
        </div>
      </button>

      <VideoModal open={open} onClose={() => setOpen(false)} item={item} />
    </>
  );
}
