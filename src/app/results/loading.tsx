import { MatchCardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page py-8 md:py-10" aria-busy="true">
      <Skeleton className="h-7 w-32 mb-6" />
      <div className="grid gap-2.5 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
