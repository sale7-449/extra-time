import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page py-6 md:py-10 space-y-8">
      <Skeleton className="h-4 w-24" />
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 md:p-10">
        <div className="flex items-center justify-center gap-10">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
