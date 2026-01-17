"use client";

import { MoreVertical, Trash2 } from "lucide-react";
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

type SourceListProps = {
  sources: Source[];
  spaceId: string;
  /** Override the default link for each source (e.g. for panel selection mode). */
  itemHref?: (source: Source) => string;
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
      <div className="rounded-md border border-dashed p-4 text-center">
        <p className="text-xs text-muted-foreground">No sources yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sources.map((source) => {
        const href = itemHref
          ? itemHref(source)
          : `/spaces/${spaceId}/sources/${source.id}`;
        const isSelected = selectedSourceId != null && source.id === selectedSourceId;

        return (
          <div
            key={source.id}
            className={cn(
              "group flex items-center gap-1 rounded-md border bg-card transition-colors",
              isSelected
                ? "border-primary bg-accent"
                : "border-transparent hover:border-border hover:bg-accent/50"
            )}
          >
            <Link
              href={href}
              className="min-w-0 flex-1 px-2.5 py-2 transition-colors hover:text-primary"
            >
              <h3 className="truncate text-sm font-medium text-foreground">
                {source.title}
              </h3>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    source.status === "ready"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : source.status === "processing"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : source.status === "error"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {source.status}
                </span>
                <span className="truncate capitalize text-[10px]">
                  {source.source_type}
                </span>
              </div>
            </Link>
            {isOwner && deleteAction && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="size-3.5" />
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
