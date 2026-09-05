"use client";

import { useState } from "react";
import type { Match, NewsArticle } from "@/lib/types";
import type { MatchedMedia } from "@/lib/providers/media/match-media-matcher";
import { Tabs } from "@/components/ui/Tabs";
import { MatchOverview } from "@/components/match/MatchOverview";
import { MatchTimeline } from "@/components/match/MatchTimeline";
import { MatchStats } from "@/components/match/MatchStats";
import { Lineup } from "@/components/match/Lineup";
import { NewsCard } from "@/components/home/NewsCard";
import { MediaCard } from "@/components/media/MediaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// matchNews يصل هنا مُصفّى مسبقاً (راجع lib/match-news-matcher.ts) — يذكر
// كلا الفريقين معاً فعلاً، لا أخباراً عامة. لا تبويب "أخبار المباراة" إطلاقاً
// إن كانت [] — لا تبويب فارغ بلا محتوى حقيقي مرتبط.
//
// قاعدة تعطيل بقية التبويبات: بيانات فعلية موجودة (مهما كانت حالة المباراة)
// = مُفعَّل دائماً. بيانات فارغة + المباراة لم تبدأ بعد = مُعطَّل (غياب متوقَّع
// وطبيعي، لا داعٍ للنقر لرؤية "لم تبدأ بعد"). بيانات فارغة + المباراة جارية/
// منتهية = يبقى مُفعَّلاً عمداً — فراغ المصدر لمباراة انتهت فعلاً معلومة صادقة
// بحد ذاتها، تستحق أن تصل للمستخدم برسالتها الواضحة (راجع MatchStats/
// MatchTimeline/Lineup) بدل إخفائها خلف زر معطَّل يبدو وكأن الميزة غائبة كلياً.
export function MatchDetailTabs({
  match,
  matchNews,
  matchMedia,
}: {
  match: Match;
  matchNews: NewsArticle[];
  matchMedia: MatchedMedia[];
}) {
  const [active, setActive] = useState("overview");
  const { t } = useLocale();

  const isPrematch = match.status === "SCHEDULED";

  // ملخص الفيديو (Highlight/Extended Highlight) أولاً ومميَّزاً — الترتيب
  // نفسه المُعتمَد أصلاً في findMatchMedia (CATEGORY_PRIORITY)، هنا نقسمه
  // بصرياً فقط لعرضين منفصلين لا نعيد فرزه.
  const highlightVideos = matchMedia.filter((m) => m.result.category === "HIGHLIGHT" || m.result.category === "EXTENDED_HIGHLIGHT");
  const relatedVideos = matchMedia.filter((m) => m.result.category !== "HIGHLIGHT" && m.result.category !== "EXTENDED_HIGHLIGHT");

  const tabItems = [
    { key: "overview", label: t.match.overview },
    {
      key: "timeline",
      label: t.match.events,
      disabled: isPrematch && match.events.length === 0,
      disabledHint: t.match.tabLockedHint,
    },
    {
      key: "stats",
      label: t.match.statistics,
      disabled: isPrematch && match.stats.length === 0,
      disabledHint: t.match.tabLockedHint,
    },
    {
      key: "lineup",
      label: t.match.lineup,
      // تشكيلة أساسية حقيقية = 11 لاعباً دائماً — أقل من ذلك ناقصة فعلياً
      // (راجع نفس المعيار في Lineup.tsx)، لا "متوفرة جزئياً تكفي".
      disabled: isPrematch && (!match.lineups || match.lineups.home.startXI.length < 11 || match.lineups.away.startXI.length < 11),
      disabledHint: t.match.tabLockedHint,
    },
    // لا فيديو منطقياً لمباراة لم تُلعَب بعد — التبويب لا يظهر إطلاقاً حينها،
    // لا مجرد مُعطَّل (نفس معاملة تبويب الأخبار أعلاه).
    ...(!isPrematch ? [{ key: "videos", label: t.match.videosTab }] : []),
    ...(matchNews.length > 0 ? [{ key: "news", label: t.match.matchNews }] : []),
  ];

  return (
    <div>
      <div className="overflow-x-auto -mx-1 px-1 mb-6">
        <Tabs items={tabItems} defaultKey="overview" onChange={setActive} />
      </div>

      {active === "overview" && <MatchOverview match={match} matchMedia={matchMedia} />}
      {active === "timeline" && <MatchTimeline match={match} />}
      {active === "stats" && <MatchStats match={match} />}
      {active === "lineup" && <Lineup match={match} />}
      {active === "videos" && (
        <div className="space-y-8">
          {/* ملخص الفيديو: قسم مستقل دائماً لمباراة بدأت/انتهت — إما فيديو
              حقيقي أو رسالة صريحة، لا اختفاء صامت (مطلوب صراحة). */}
          <div>
            <h4 className="text-sm font-extrabold mb-3">{t.videos.matchHighlightsSection}</h4>
            {highlightVideos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {highlightVideos.map(({ item }) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState title={t.videos.noMatchHighlight} />
            )}
          </div>

          {relatedVideos.length > 0 && (
            <div>
              <h4 className="text-sm font-extrabold mb-3">{t.videos.relatedVideosSection}</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedVideos.map(({ item }) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {active === "news" &&
        (matchNews.length > 0 ? (
          <div className="space-y-4">
            {matchNews.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState title={t.match.noMatchNews} />
        ))}
    </div>
  );
}
