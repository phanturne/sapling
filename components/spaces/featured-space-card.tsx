import type { Database } from "@/supabase/types";
import { Globe } from "lucide-react";
import Link from "next/link";

type Space = Database["public"]["Tables"]["spaces"]["Row"];

type FeaturedSpaceCardProps = {
  space: Space;
};

export function FeaturedSpaceCard({ space }: FeaturedSpaceCardProps) {
  return (
    <Link href={`/spaces/${space.id}`}>
      <div className="group relative h-48 overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-lg">
        {/* Placeholder for featured image - can be replaced with actual image later */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-muted opacity-50" />
        
        <div className="relative flex h-full flex-col justify-between p-4">
          <div className="flex-1 min-h-0">
            <div className="mb-2 flex items-center gap-2">
              {/* Placeholder for source/author logo */}
              <div className="h-5 w-5 rounded bg-primary/20 shrink-0" />
              <span className="text-xs font-medium text-muted-foreground truncate">
                {space.visibility === "public" ? "Public" : "Private"}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-foreground group-hover:underline line-clamp-2">
              {space.title}
            </h3>
            
            {space.description && (
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                {space.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>
              {new Date(space.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {space.visibility === "public" && (
              <Globe className="h-3.5 w-3.5 shrink-0" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
