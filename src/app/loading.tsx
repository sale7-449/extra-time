import { MatchCardSkeleton, NewsCardSkeleton, Skeleton } from "@/components/ui/Skeleton";

/** واجهة تحميل عامة (الرئيسية وكل صفحة بلا loading.tsx خاص بها) — بدونها تنتظر
 * Next.js اكتمال كل جلب البيانات على الخادم قبل إرسال أي شيء، فلا تُرسَل
 * الـlayout (الهيدر/التنقل) ولا يبدأ الـhydration إلا بعد ثوانٍ. */
export default function Loading() {
  return (
    <div className="container-page py-10 space-y-12" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-9 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-1/2 max-w-sm" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
              <NewsCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
