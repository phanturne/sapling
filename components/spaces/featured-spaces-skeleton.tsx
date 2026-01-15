import { FeaturedSpaceCardSkeleton } from "./featured-space-card-skeleton";

export function FeaturedSpacesSkeleton() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="h-8 w-40 rounded bg-accent animate-pulse" />
        <div className="h-4 w-16 rounded bg-accent animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <FeaturedSpaceCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

