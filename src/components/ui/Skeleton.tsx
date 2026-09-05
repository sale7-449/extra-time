import { cx } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-[var(--radius-sm)] bg-surface-2",
        className
      )}
    />
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

export function NewsCardSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="h-16 w-16 shrink-0 rounded-[var(--radius-sm)]" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
