import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedSpaceCardSkeleton() {
  return (
    <div className="relative h-64 overflow-hidden rounded-lg border bg-card shadow-sm">
      <Skeleton className="absolute inset-0" />
      <div className="relative flex h-full flex-col justify-between p-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </div>
    </div>
  );
}

