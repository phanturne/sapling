import Link from "next/link";

import type { Database } from "@/supabase/types";

type Source = Database["public"]["Tables"]["sources"]["Row"];

type SourceListProps = {
  sources: Source[];
  spaceId: string;
};

export function SourceList({ sources, spaceId }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">No sources yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((source) => (
        <div
          key={source.id}
          className="flex items-center justify-between rounded-md border bg-card p-4"
        >
          <Link
            href={`/spaces/${spaceId}/sources/${source.id}`}
            className="flex-1 transition-colors hover:text-primary"
          >
            <h3 className="font-semibold text-foreground">{source.title}</h3>
            <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="capitalize">{source.source_type}</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  source.status === "ready"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : source.status === "processing"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : source.status === "error"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {source.status}
              </span>
              {source.file_size && (
                <span>
                  {(source.file_size / 1024).toFixed(1)} KB
                </span>
              )}
              <span>
                {new Date(source.updated_at).toLocaleDateString()}
              </span>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}

