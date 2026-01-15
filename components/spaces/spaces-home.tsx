"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Database } from "@/supabase/types";
import { Grid, List, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FeaturedSpaceCard } from "./featured-space-card";
import { SpaceList } from "./space-list";

type Space = Database["public"]["Tables"]["spaces"]["Row"];

type SpacesData = {
  featuredSpaces: Space[];
  recentSpaces: Space[];
  mySpaces: Space[];
  allPublicSpaces: Space[];
};

type SpacesHomeProps = {
  initialPanel: string;
  initialData: SpacesData;
  isAuthenticated: boolean;
};

export function SpacesHome({ initialPanel, initialData, isAuthenticated }: SpacesHomeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawPanel = searchParams.get("panel");

  const activePanel =
    rawPanel === "all" || rawPanel === "my-spaces" || rawPanel === "featured"
      ? rawPanel
      : initialPanel === "all" ||
        initialPanel === "my-spaces" ||
        initialPanel === "featured"
        ? initialPanel
        : "all";

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Use initial data from server, all panels are pre-fetched
  const [data] = useState<SpacesData>(initialData);

  const handlePanelChange = (panel: string) => {
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (panel === "all") {
      params.delete("panel");
      router.push(params.toString() ? `/?${params.toString()}` : "/", {
        scroll: false,
      });
    } else {
      params.set("panel", panel);
      router.push(`/?${params.toString()}`, { scroll: false });
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Top Navigation Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={activePanel === "all" ? "default" : "ghost"}
            onClick={() => handlePanelChange("all")}
            className={cn(
              "rounded-full",
              activePanel === "all" && "bg-primary text-primary-foreground"
            )}
          >
            All
          </Button>
          <Button
            variant={activePanel === "my-spaces" ? "default" : "ghost"}
            onClick={() => handlePanelChange("my-spaces")}
            className={cn(
              "rounded-full",
              activePanel === "my-spaces" && "bg-primary text-primary-foreground"
            )}
          >
            My Spaces
          </Button>
          <Button
            variant={activePanel === "featured" ? "default" : "ghost"}
            onClick={() => handlePanelChange("featured")}
            className={cn(
              "rounded-full",
              activePanel === "featured" && "bg-primary text-primary-foreground"
            )}
          >
            Featured Spaces
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md bg-background p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Link href="/spaces/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create new
            </Button>
          </Link>
        </div>
      </div>

      {/* Panel Content - All data pre-fetched, instant switching */}
      <div className="relative">
        {/* All Panel */}
        <div
          className={cn(
            "transition-opacity duration-150 ease-in-out",
            activePanel === "all" ? "opacity-100 relative" : "opacity-0 absolute inset-0 pointer-events-none"
          )}
        >
          <div className="space-y-8">
            {/* Featured Spaces Section */}
            {data.featuredSpaces.length > 0 && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Featured Spaces</h2>
                  {data.featuredSpaces.length > 4 && (
                    <Link
                      href="/?panel=featured"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      See all &gt;
                    </Link>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {data.featuredSpaces.slice(0, 4).map((space) => (
                    <FeaturedSpaceCard key={space.id} space={space} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Spaces Section - Only show for authenticated users */}
            {isAuthenticated && data.recentSpaces.length > 0 && (
              <div>
                <h2 className="mb-4 text-2xl font-semibold">Recent Spaces</h2>
                <SpaceList spaces={data.recentSpaces} viewMode={viewMode} />
              </div>
            )}
          </div>
        </div>

        {/* My Spaces Panel */}
        <div
          className={cn(
            "transition-opacity duration-150 ease-in-out",
            activePanel === "my-spaces" ? "opacity-100 relative" : "opacity-0 absolute inset-0 pointer-events-none"
          )}
        >
          <div>
            <h2 className="mb-4 text-2xl font-semibold">My Spaces</h2>
            {isAuthenticated ? (
              data.mySpaces.length > 0 ? (
                <SpaceList spaces={data.mySpaces} viewMode={viewMode} />
              ) : (
                <div className="rounded-lg border border-dashed p-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Create your first space</h3>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Organize your notes and sources into focused spaces for each topic you&apos;re studying.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Link href="/spaces/new">
                      <Button variant="default">New space</Button>
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <svg
                    className="h-8 w-8 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold">Create your own spaces</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Sign in to organize your notes, sources, and knowledge in personalized spaces
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/auth/login">
                    <Button variant="default">Sign in</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button variant="outline">Sign up</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Featured Panel */}
        <div
          className={cn(
            "transition-opacity duration-150 ease-in-out",
            activePanel === "featured" ? "opacity-100 relative" : "opacity-0 absolute inset-0 pointer-events-none"
          )}
        >
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Featured Spaces</h2>
            <SpaceList spaces={data.allPublicSpaces} viewMode={viewMode} />
          </div>
        </div>
      </div>
    </div>
  );
}

