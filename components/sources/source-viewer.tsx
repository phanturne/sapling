import type { Database } from "@/supabase/types";

type Source = Database["public"]["Tables"]["sources"]["Row"];

type SourceViewerProps = {
  source: Source;
};

export function SourceViewer({ source }: SourceViewerProps) {
  if (source.status === "processing") {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-yellow-600 dark:text-yellow-400">
          This source is being processed. Please check back later.
        </p>
      </div>
    );
  }

  if (source.status === "error") {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-red-600 dark:text-red-400">
          There was an error processing this source.
        </p>
      </div>
    );
  }

  if (!source.content) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">No content available.</p>
      </div>
    );
  }

  const date = new Date(source.updated_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header: Title and date */}
      <div className="shrink-0 px-4 py-3">
        <h2 className="text-lg font-semibold">{source.title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {source.content}
          </pre>
        </div>
      </div>
    </div>
  );
}

