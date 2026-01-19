"use client";

import { AlertCircle, MoreVertical, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Database } from "@/supabase/types";

type Source = Database["public"]["Tables"]["sources"]["Row"];

// Source list item - excludes content field for performance (content can be huge)
type SourceListItem = Omit<Source, "content">;

type SourceListProps = {
  sources: SourceListItem[];
  spaceId: string;
  /** Override the default link for each source (e.g. for panel selection mode). */
  itemHref?: (source: SourceListItem) => string;
  /** When set, the matching source gets selected styling. */
  selectedSourceId?: string | null;
  /** Whether the user is the owner (shows delete option) */
  isOwner?: boolean;
  /** Delete action for each source */
  deleteAction?: (sourceId: string) => (formData: FormData) => Promise<void>;
};

export function SourceList({
  sources,
  spaceId,
  itemHref,
  selectedSourceId,
  isOwner = false,
  deleteAction,
}: SourceListProps) {
  if (sources.length === 0) {
    return (
      <div className="rounded-md p-4 text-center">
        <p className="text-sm text-muted-foreground">No sources yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {sources.map((source) => {
        const href = itemHref
          ? itemHref(source)
          : `/spaces/${spaceId}/sources/${source.id}`;
        const isSelected = selectedSourceId != null && source.id === selectedSourceId;

        const isProcessing = source.status === "processing";
        const hasError = source.status === "error";

        return (
          <div
            key={source.id}
            className={cn(
              "group flex items-center gap-1 rounded-md transition-colors",
              isSelected
                ? "bg-accent"
                : "hover:bg-accent/50"
            )}
          >
            <Link
              href={href}
              className="min-w-0 flex-1 px-3 py-2 transition-colors hover:text-primary"
            >
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-medium text-foreground">
                  {source.title}
                </h3>
                {isProcessing && (
                  <RefreshCw className="size-3 shrink-0 animate-spin text-muted-foreground" />
                )}
                {hasError && (
                  <AlertCircle className="size-3 shrink-0 text-destructive" />
                )}
              </div>
            </Link>
            {isOwner && deleteAction && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent/80 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <form action={deleteAction(source.id)} id={`delete-form-${source.id}`}>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(e) => {
                        e.preventDefault();
                        const form = document.getElementById(
                          `delete-form-${source.id}`
                        ) as HTMLFormElement;
                        if (form) form.requestSubmit();
                      }}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}
