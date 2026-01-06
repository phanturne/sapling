import type { Database } from "@/supabase/types";
import { SpaceCard } from "./space-card";

type Space = Database["public"]["Tables"]["spaces"]["Row"];

type SpaceListProps = {
  spaces: Space[];
};

export function SpaceList({ spaces }: SpaceListProps) {
  if (spaces.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          No spaces yet. Create your first space to get started!
        </p>
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

