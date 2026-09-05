import { MatchCardSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page py-8 md:py-10 space-y-8">
      <div className="h-7 w-32 rounded bg-surface-2 animate-pulse" />
      <div className="grid gap-2.5 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
