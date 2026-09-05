import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getNewsById } from "@/lib/services/news.service";
import { encodeNewsId, decodeNewsId } from "@/lib/news-id";
import { tagId, espnSlugForCanonicalLeague } from "@/lib/providers/football/ids";
import { Button } from "@/components/ui/Button";
import { BackToNewsButton } from "@/components/news/BackToNewsButton";
import { StoryTrigger } from "@/components/story/StoryTrigger";
import { SnapchatCreativeKitButton } from "@/components/story/SnapchatCreativeKitButton";
import { toNewsContentItem } from "@/lib/providers/social/content-builders";
import { formatRelativeTime } from "@/lib/utils";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";
import { isAllowedImageHost } from "@/lib/image-hosts";

const categoryKey = {
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
} as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const locale = await getServerLocale();
  const article = await getNewsById(decodeNewsId(id) ?? "", locale);
  if (!article) return { title: `${getMessages(locale).common.notFoundTitle} — EXTRA TIME` };

  const title = `${article.title} — EXTRA TIME`;
  return {
    title,
    description: article.summary,
    alternates: { canonical: `/news/${encodeNewsId(article.id)}` },
    openGraph: {
      title: article.title,
      description: article.summary,
      // siteName مكرَّر هنا عمداً — راجع نفس الملاحظة في matches/[id]/page.tsx:
      // الصفحة الفرعية التي تُعرّف openGraph خاصاً بها تستبدل كائن الجذر
      // كاملاً، لا تدمجه (تحقّق فعلي عبر نفق Cloudflare العام).
      siteName: "EXTRA TIME",
      type: "article",
      publishedTime: article.publishedAt,
      images: article.imageUrl ? [{ url: article.imageUrl }] : undefined,
    },
    twitter: {
      card: article.imageUrl ? "summary_large_image" : "summary",
      title: article.title,
      description: article.summary,
      images: article.imageUrl ? [article.imageUrl] : undefined,
    },
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getServerLocale();
  const t = getMessages(locale);
  const article = await getNewsById(decodeNewsId(id) ?? "", locale);

  if (!article) notFound();

  // خبر إنجليزي داخل واجهة عربية RTL (أو العكس): بلا dir صريح هنا كانت علامات
  // الترقيم البادئة/الختامية (؟ ! :) تنعكس بصرياً لأن اتجاه الفقرة الافتراضي
  // موروث من الصفحة لا من لغة النص الفعلية. dir="auto" غير كافٍ لأن لغة
  // النص معروفة بالفعل من المصدر — لا حاجة لتخمين المتصفح.
  const textDir = article.language === "en" ? "ltr" : article.language === "ar" ? "rtl" : undefined;

  // رابط البطولة عبر بادئة espn- تحديداً (لا المعرّف الموحَّد الخام) — يُوجَّه
  // مباشرة لمزوّد ESPN بلا مرور على سلسلة "معرّف بلا بادئة" الهشّة التي تفشل
  // بصمت إن كانت حصة API-Football اليومية منتهية (حالة شائعة فعلياً).
  const espnSlug = article.competitionId ? espnSlugForCanonicalLeague(article.competitionId) : null;
  const competitionHref = espnSlug ? `/competitions/${tagId("espn", espnSlug)}` : null;

  // بيانات مبنيّة حصراً على الحقول المتوفرة فعلياً من المصدر — لا articleBody
  // لأننا لا نملك النص الكامل، ولا أي حقل آخر غير مؤكَّد.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    image: article.imageUrl ? [article.imageUrl] : undefined,
    datePublished: article.publishedAt,
    author: { "@type": "Organization", name: article.source },
    publisher: { "@type": "Organization", name: "EXTRA TIME" },
    mainEntityOfPage: article.sourceUrl,
  };

  return (
    <div className="container-page py-6 md:py-10 max-w-2xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <BackToNewsButton variant="top" />

      <span className="text-xs font-bold text-primary">
        {t.news[categoryKey[article.category]]}
        {article.relatedName && <span className="text-muted-dim font-bold"> · {article.relatedName}</span>}
      </span>

      <h1 dir={textDir} className="mt-2 text-2xl md:text-3xl font-extrabold leading-tight text-balance">{article.title}</h1>

      <p suppressHydrationWarning className="mt-3 text-sm text-muted-dim">
        {article.source} · {formatRelativeTime(article.publishedAt, locale)}
      </p>

      {article.imageUrl && isAllowedImageHost(article.imageUrl) && (
        <div className="relative mt-6 h-56 md:h-80 w-full overflow-hidden rounded-[var(--radius-lg)] bg-surface-2">
          <Image src={article.imageUrl} alt={article.title} fill sizes="(min-width: 768px) 640px, 100vw" className="object-cover" priority />
        </div>
      )}

      <p dir={textDir} className="mt-6 text-base leading-relaxed text-ink">{article.summary}</p>

      <p className="mt-6 text-xs text-muted-dim">{t.news.attributionNote}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button href={article.sourceUrl} target="_blank" variant="primary">
          {t.news.readOriginal}
        </Button>
        {competitionHref && (
          <Button href={competitionHref} variant="secondary">
            {t.competitions.viewCompetition}
          </Button>
        )}
        <StoryTrigger item={toNewsContentItem(article)} label={t.story.createStory} modalTitle={t.story.newsTitle} />
        <SnapchatCreativeKitButton path={`/news/${encodeNewsId(article.id)}`} />
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <BackToNewsButton variant="bottom" />
      </div>
    </div>
  );
}
