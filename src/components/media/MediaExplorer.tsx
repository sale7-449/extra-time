"use client";

import { useMemo, useState } from "react";
import type { MediaItem, MediaCategory } from "@/lib/types";
import { MediaCard } from "@/components/media/MediaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon } from "@/components/icons";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const categoryKey: Record<
  MediaCategory,
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

const ALL_CATEGORIES: MediaCategory[] = [
  "GOAL",
  "HIGHLIGHT",
  "EXTENDED_HIGHLIGHT",
  "SKILLS",
  "INTERVIEW",
  "PRESS_CONFERENCE",
  "OFFICIAL_CLUB",
  "OFFICIAL_LEAGUE",
  "NATIONAL_TEAM",
];

// فئات "ملخصات المباريات" — فلتر سريع مجمَّع بدل اختيار كل فئة على حدة.
const MATCH_SUMMARY_CATEGORIES: MediaCategory[] = ["GOAL", "HIGHLIGHT", "EXTENDED_HIGHLIGHT"];

/** بحث/تصفية محلية بالكامل فوق مجموعة أُحضِرت من السيرفر مرة واحدة — بنفس
 * نمط NewsExplorer.tsx تماماً. */
export function MediaExplorer({ items }: { items: MediaItem[] }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MediaCategory | "ALL">("ALL");
  const [source, setSource] = useState<string>("ALL");
  const [matchSummaryOnly, setMatchSummaryOnly] = useState(false);

  const sources = useMemo(() => [...new Set(items.map((i) => i.source))].sort(), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (matchSummaryOnly && !MATCH_SUMMARY_CATEGORIES.includes(item.category)) return false;
      if (category !== "ALL" && item.category !== category) return false;
      if (source !== "ALL" && item.source !== source) return false;
      if (q && !item.title.toLowerCase().includes(q) && !(item.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, category, source, matchSummaryOnly]);

  const selectClass =
    "h-10 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm font-bold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-dim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.videos.searchPlaceholder}
            className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface ps-9 pe-3 text-sm text-ink placeholder:text-muted-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={category} onChange={(e) => setCategory(e.target.value as MediaCategory | "ALL")} className={selectClass}>
            <option value="ALL">{t.videos.filterCategory}: {t.videos.filterAll}</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.videos[categoryKey[c]]}
              </option>
            ))}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass}>
            <option value="ALL">{t.videos.filterSource}: {t.videos.filterAll}</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setMatchSummaryOnly((v) => !v)}
          aria-pressed={matchSummaryOnly}
          className={`h-9 px-4 rounded-full border text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
            matchSummaryOnly ? "bg-primary border-primary text-primary-ink" : "border-border bg-surface text-muted hover:text-ink hover:border-primary/40"
          }`}
        >
          {t.videos.matchSummariesFilter}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t.videos.searchNoResults} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
