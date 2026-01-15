import { SpaceCardSkeleton } from "./space-card-skeleton";

type SpaceListSkeletonProps = {
  count?: number;
};

export function SpaceListSkeleton({ count = 6 }: SpaceListSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SpaceCardSkeleton key={i} />
      ))}
    </div>
  );
}

