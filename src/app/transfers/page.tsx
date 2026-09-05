import { NewsCard } from "@/components/home/NewsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getNewsByCategory } from "@/lib/services/news.service";
import { safeResolve } from "@/lib/errors";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.news.transfersTitle} — EXTRA TIME` };
}

/**
 * أخبار انتقالات حقيقية (مصنَّفة من نص RSS نفسه — لا قاعدة بيانات انتقالات
 * منظّمة، لا مصدر مجاني وقانوني موثوق لهذا متاح حالياً). الصفحة تقول ذلك
 * صراحة بدل الإيحاء بأنها مصدر تأكيد رسمي. راجع classify.ts::findTransferType
 * — التصنيف الفرعي (رسمي/إشاعة/إعارة...) يظهر فقط عند ثقة كافية من النص.
 */
export default async function TransfersPage() {
  const locale = await getServerLocale();
  const t = getMessages(locale);
  const articles = await safeResolve(getNewsByCategory("TRANSFERS", locale, 30), [], "transfers-page");

  return (
    <div className="container-page py-8 md:py-10">
      <h1 className="text-2xl font-extrabold mb-2">{t.news.transfersTitle}</h1>
      <p className="text-sm text-muted mb-8 max-w-2xl">{t.news.transfersSubtitle}</p>

      {articles.length === 0 ? (
        <EmptyState title={t.news.transfersEmpty} description={t.news.newsUnavailableDesc} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <div key={article.id} className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
              <NewsCard article={article} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
