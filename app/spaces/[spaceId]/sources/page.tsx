import Link from "next/link";
import { redirect } from "next/navigation";

import { SourceList } from "@/components/sources/source-list";
import { SourceListPolling } from "@/components/sources/source-list-polling";
import { SourceUpload } from "@/components/sources/source-upload";
import { createClient } from "@/utils/supabase/server";
import { uploadSource } from "./actions";

type SourcesPageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SourcesPage({
  params,
  searchParams,
}: SourcesPageProps) {
  const supabase = await createClient();
  const { spaceId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Verify user has access to space
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, user_id, visibility, title")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space) {
    redirect("/spaces?error=not_found");
  }

  // Allow unauthenticated users to view public spaces
  if (!user && space.visibility !== "public") {
    redirect("/auth/login");
  }

  if (user && space.user_id !== user.id && space.visibility !== "public") {
    redirect("/spaces?error=forbidden");
  }

  const { data: sources, error: sourcesError } = await supabase
    .from("sources")
    .select("*")
    .eq("space_id", spaceId)
    .order("updated_at", { ascending: false });

  if (sourcesError) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Failed to load sources</p>
      </div>
    );
  }

  const isOwner = user ? space.user_id === user.id : false;

  const params_search = (await searchParams) ?? {};
  const error = typeof params_search.error === "string" ? params_search.error : null;
  const success = typeof params_search.success === "string" ? params_search.success : null;

  const errorMessages: Record<string, string> = {
    validation_failed: "Invalid input. Please check your form data.",
    no_file: "Please select a file",
    invalid_file_type: "Invalid file type. Allowed: PDF, TXT, MD",
    file_too_large: "File size exceeds 10MB limit",
    upload_failed: "Failed to upload source",
    create_failed: "Failed to create source",
    invalid_url: "Invalid URL",
    invalid_source_type: "Invalid source type",
    delete_failed: "Failed to delete source",
  };

  const humanError = error ? errorMessages[error] || "An error occurred" : null;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link
          href={`/spaces/${spaceId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to {space.title}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Sources</h1>
      </div>

      {humanError && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {humanError}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-500 bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-200">
          {success === "deleted"
            ? "Source deleted successfully"
            : "Source uploaded successfully"}
        </div>
      )}

      {isOwner && (
        <div className="mb-6">
          <SourceUpload
            onUpload={uploadSource.bind(null, spaceId)}
            spaceId={spaceId}
          />
        </div>
      )}

      <SourceListPolling
        key={`polling-${sources?.filter((s) => s.status === "processing").length ?? 0}`}
        hasProcessingSources={sources?.some((s) => s.status === "processing") ?? false}
      >
        <SourceList sources={sources || []} spaceId={spaceId} />
      </SourceListPolling>
    </div>
  );
}
