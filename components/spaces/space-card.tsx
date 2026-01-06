import Link from "next/link";

import type { Database } from "@/supabase/types";

type Space = Database["public"]["Tables"]["spaces"]["Row"];

type SpaceCardProps = {
  space: Space;
};

export function SpaceCard({ space }: SpaceCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link href={`/spaces/${space.id}`}>
            <h3 className="text-lg font-semibold text-foreground hover:underline">
              {space.title}
            </h3>
          </Link>
          {space.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {space.description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span
              className={`rounded-full px-2 py-1 ${
                space.visibility === "public"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {space.visibility}
            </span>
            <span>
              {new Date(space.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

