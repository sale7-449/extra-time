import { NewsCardSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page py-8 md:py-10 space-y-8">
      <div className="h-7 w-24 rounded bg-surface-2 animate-pulse" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
            <NewsCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
