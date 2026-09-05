"use client";

import { useMemo, useState } from "react";
import type { NewsArticle, NewsCategory } from "@/lib/types";
import { NewsCard } from "@/components/home/NewsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon } from "@/components/icons";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const categoryKey: Record<NewsCategory, "categoryFootball" | "categorySaudiLeague" | "categoryPremierLeague" | "categoryLaLiga" | "categoryBundesliga" | "categorySerieA" | "categoryLigue1" | "categoryChampionsLeague" | "categoryInternational" | "categoryTransfers"> = {
  FOOTBALL: "categoryFootball",
  SAUDI_LEAGUE: "categorySaudiLeague",
  PREMIER_LEAGUE: "categoryPremierLeague",
  LA_LIGA: "categoryLaLiga",
  BUNDESLIGA: "categoryBundesliga",
  SERIE_A: "categorySerieA",
  LIGUE_1: "categoryLigue1",
  CHAMPIONS_LEAGUE: "categoryChampionsLeague",
  INTERNATIONAL: "categoryInternational",
  TRANSFERS: "categoryTransfers",
};

const ALL_CATEGORIES: NewsCategory[] = [
  "SAUDI_LEAGUE",
  "PREMIER_LEAGUE",
  "LA_LIGA",
  "BUNDESLIGA",
  "SERIE_A",
  "LIGUE_1",
  "CHAMPIONS_LEAGUE",
  "INTERNATIONAL",
  "TRANSFERS",
  "FOOTBALL",
];

/**
 * بحث/تصفية محلية بالكامل (بلا خدمة خارجية) فوق مجموعة أُحضِرت من السيرفر
 * مرة واحدة — لا طلب شبكة إضافي لكل تفاعل. مناسب لحجم الأخبار الحالي
 * (عشرات، لا آلاف)؛ يكفي لهذه المرحلة دون تعقيد بحث خادمي إضافي.
 *
 * `defaultArticles` (قائمة "أحدث الأخبار" الجاهزة مسبقاً — طازجة ومحدودة
 * العدد، بلا ما ظهر في الأقسام المصنَّفة أعلاه) تُعرض عندما لا يوجد بحث/فلتر
 * نشط. بمجرد البحث أو اختيار فلتر، يتوسّع البحث لكامل `articles` (المجمّع
 * الأكبر) كي لا يُخفي المستخدم نتائج فعلية موجودة لمجرد أنها أقدم من 7 أيام
 * أو ظهرت مسبقاً في قسم آخر — القيد الافتراضي خاص بالتصفّح العرضي فقط.
 */
export function NewsExplorer({ articles, defaultArticles }: { articles: NewsArticle[]; defaultArticles: NewsArticle[] }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<NewsCategory | "ALL">("ALL");
  const [source, setSource] = useState<string>("ALL");
  const [language, setLanguage] = useState<"ALL" | "ar" | "en">("ALL");

  const sources = useMemo(() => [...new Set(articles.map((a) => a.source))].sort(), [articles]);
  const isFiltering = query.trim() !== "" || category !== "ALL" || source !== "ALL" || language !== "ALL";

  const filtered = useMemo(() => {
    if (!isFiltering) return defaultArticles;
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (category !== "ALL" && a.category !== category) return false;
      if (source !== "ALL" && a.source !== source) return false;
      if (language !== "ALL" && a.language !== language) return false;
      if (q && !a.title.toLowerCase().includes(q) && !a.summary.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [articles, defaultArticles, isFiltering, query, category, source, language]);

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
            placeholder={t.news.searchPlaceholder}
            className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface ps-9 pe-3 text-sm text-ink placeholder:text-muted-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={category} onChange={(e) => setCategory(e.target.value as NewsCategory | "ALL")} className={selectClass}>
            <option value="ALL">{t.news.filterCategory}: {t.news.filterAll}</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.news[categoryKey[c]]}
              </option>
            ))}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass}>
            <option value="ALL">{t.news.filterSource}: {t.news.filterAll}</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value as "ALL" | "ar" | "en")} className={selectClass}>
            <option value="ALL">{t.news.filterLanguage}: {t.news.filterAll}</option>
            <option value="ar">{t.news.inArabic}</option>
            <option value="en">{t.news.inEnglish}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t.news.searchNoResults} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <div key={article.id} className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
              <NewsCard article={article} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
