import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page py-8 md:py-10" aria-busy="true">
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-4 w-56 mb-8" />
      <div className="grid grid-cols-2 gap-4 max-w-md">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
