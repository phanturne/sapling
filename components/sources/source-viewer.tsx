import type { Database } from "@/supabase/types";

type Source = Database["public"]["Tables"]["sources"]["Row"];

type SourceViewerProps = {
  source: Source;
};

export function SourceViewer({ source }: SourceViewerProps) {
  if (source.status === "processing") {
    return (
      <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-6 text-center dark:bg-yellow-900/20">
        <p className="text-yellow-800 dark:text-yellow-200">
          This source is being processed. Please check back later.
        </p>
      </div>
    );
  }

  if (source.status === "error") {
    return (
      <div className="rounded-lg border border-red-500 bg-red-50 p-6 text-center dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-200">
          There was an error processing this source.
        </p>
      </div>
    );
  }

  if (!source.content) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-muted-foreground">No content available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-2xl font-bold">{source.title}</h2>
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="capitalize">{source.source_type}</span>
          {source.source_url && (
            <a
              href={source.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View original
            </a>
          )}
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {source.content}
          </pre>
        </div>
      </div>
    </div>
  );
}

