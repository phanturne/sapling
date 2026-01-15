import type { Database } from "@/supabase/types";
import { Globe } from "lucide-react";
import Link from "next/link";

type Space = Database["public"]["Tables"]["spaces"]["Row"];

type SpaceCardListProps = {
  space: Space;
};

export function SpaceCardList({ space }: SpaceCardListProps) {
  return (
    <Link href={`/spaces/${space.id}`} className="block">
      <div className="group flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-foreground group-hover:underline truncate">
              {space.title}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                space.visibility === "public"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {space.visibility}
            </span>
            {space.visibility === "public" && (
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
          {space.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-1">
              {space.description}
            </p>
          )}
        </div>
        <div className="shrink-0 text-xs text-muted-foreground">
          {new Date(space.updated_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>
    </Link>
  );
}

