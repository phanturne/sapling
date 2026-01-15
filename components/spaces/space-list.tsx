import type { Database } from "@/supabase/types";
import { SpaceCard } from "./space-card";
import { SpaceCardList } from "./space-card-list";

type Space = Database["public"]["Tables"]["spaces"]["Row"];

type SpaceListProps = {
  spaces: Space[];
  viewMode?: "grid" | "list";
};

export function SpaceList({ spaces, viewMode = "grid" }: SpaceListProps) {
  if (spaces.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          No spaces yet. Create your first space to get started!
        </p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {spaces.map((space) => (
          <SpaceCardList key={space.id} space={space} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {spaces.map((space) => (
        <SpaceCard key={space.id} space={space} />
      ))}
    </div>
  );
}

