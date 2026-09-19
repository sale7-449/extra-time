"use client";

import Link from "next/link";
import Image from "next/image";
import type { NewsArticle } from "@/lib/types";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { encodeNewsId } from "@/lib/news-id";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { isAllowedImageHost } from "@/lib/image-hosts";

const categoryKey: Record<
  NewsArticle["category"],
  | "categoryFootball"
  | "categorySaudiLeague"
  | "categoryPremierLeague"
  | "categoryLaLiga"
  | "categoryBundesliga"
  | "categorySerieA"
  | "categoryLigue1"
  | "categoryChampionsLeague"
  | "categoryInternational"
  | "categoryTransfers"
> = {
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

const transferTypeKey: Record<NonNullable<NewsArticle["transferType"]>, "transferOfficial" | "transferRumour" | "transferContract" | "transferLoan" | "transferFree"> = {
  OFFICIAL: "transferOfficial",
  RUMOUR: "transferRumour",
  CONTRACT: "transferContract",
  LOAN: "transferLoan",
  FREE_TRANSFER: "transferFree",
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-[var(--radius-sm)]";

export function NewsCard({ article, size = "md" }: { article: NewsArticle; size?: "sm" | "md" | "lg" }) {
  const { t, locale } = useLocale();
  const categoryLabel = t.news[categoryKey[article.category]];
  const transferLabel = article.transferType ? t.news[transferTypeKey[article.transferType]] : null;
  // الخبر بلغة غير لغة الواجهة الحالية — لا ترجمة آلية أبداً، فقط توضيح
  // صريح بلغته الأصلية بدل الإيحاء بأنه عربي/إنجليزي وهو ليس كذلك.
  const languageNote = article.language && article.language !== locale ? (article.language === "en" ? t.news.inEnglish : t.news.inArabic) : null;
  const href = `/news/${encodeNewsId(article.id)}`;
  // نفس إصلاح اتجاه النص في صفحة الخبر — عنوان إنجليزي داخل بطاقة عربية RTL
  // (أو العكس) بلا dir صريح يُظهر علامات الترقيم البادئة/الختامية معكوسة.
  const textDir = article.language === "en" ? "ltr" : article.language === "ar" ? "rtl" : undefined;

  if (size === "lg") {
    return (
      <Link href={href} className={`group block overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface transition-colors hover:border-primary/30 ${focusRing}`}>
        <div className="relative h-52 md:h-72 overflow-hidden bg-surface-2">
          {article.imageUrl && isAllowedImageHost(article.imageUrl) && (
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/25 to-transparent" />
          <span className="absolute top-4 end-4 rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-ink">
            {t.news.featuredNow}
          </span>
        </div>
        <div className="p-5">
          <span className="text-xs font-bold text-primary">
            {categoryLabel}
            {transferLabel && <span className="text-warning font-bold"> · {transferLabel}</span>}
            {article.relatedName && <span className="text-muted-dim font-bold"> · {article.relatedName}</span>}
          </span>
          <h3 dir={textDir} className="mt-2 text-lg md:text-xl font-extrabold leading-snug text-balance group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          <p dir={textDir} className="mt-2 text-sm text-muted line-clamp-2">{article.summary}</p>
          <p className="mt-3 text-xs text-muted-dim">
            {article.source} · <RelativeTime iso={article.publishedAt} locale={locale} />
            {languageNote && <> · {languageNote}</>}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className={`group flex gap-3 p-1 -m-1 ${focusRing}`}>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface-2">
        {article.imageUrl && isAllowedImageHost(article.imageUrl) && (
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            sizes="128px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        )}
      </div>
      <div className="min-w-0 flex flex-col justify-center gap-1">
        <span className="text-[11px] font-bold text-primary">
          {categoryLabel}
          {transferLabel && <span className="text-warning font-bold"> · {transferLabel}</span>}
          {article.relatedName && <span className="text-muted-dim font-bold"> · {article.relatedName}</span>}
        </span>
        <h4 dir={textDir} className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {article.title}
        </h4>
        <p className="text-xs text-muted-dim">
          {article.source} · <RelativeTime iso={article.publishedAt} locale={locale} />
          {languageNote && <> · {languageNote}</>}
        </p>
      </div>
    </Link>
  );
}
