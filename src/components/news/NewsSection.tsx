import type { ReactNode } from "react";
import type { NewsArticle } from "@/lib/types";
import { NewsCard } from "@/components/home/NewsCard";
import { SectionHeader } from "@/components/shared/SectionHeader";

/** صف قسم أخبار مُصنَّف (السعودية/الانتقالات/دوري الأبطال...) — لا يُعرض
 * إطلاقاً إن كانت المقالات فارغة، بدل قسم عنوانه بلا محتوى. */
export function NewsSection({ title, href, icon, articles }: { title: string; href?: string; icon?: ReactNode; articles: NewsArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <section>
      <SectionHeader title={title} href={href} icon={icon} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <div key={article.id} className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
            <NewsCard article={article} />
          </div>
        ))}
      </div>
    </section>
  );
}
