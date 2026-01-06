import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/utils/supabase/server";
import { deleteSource } from "../actions";
import { SourceViewer } from "@/components/sources/source-viewer";
import { Button } from "@/components/ui/button";

type SourcePageProps = {
  params: Promise<{ spaceId: string; sourceId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SourcePage({
  params,
  searchParams,
}: SourcePageProps) {
  const supabase = await createClient();
  const { spaceId, sourceId } = await params;

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

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .eq("space_id", spaceId)
    .single();

  if (sourceError || !source) {
    redirect(`/spaces/${spaceId}/sources?error=not_found`);
  }

  const isOwner = user && space.user_id === user.id;

  const params_search = (await searchParams) ?? {};
  const error = typeof params_search.error === "string" ? params_search.error : null;
  const success = typeof params_search.success === "string" ? params_search.success : null;

  const errorMessages: Record<string, string> = {
    delete_failed: "Failed to delete source",
    not_found: "Source not found",
  };

  const humanError = error ? errorMessages[error] || "An error occurred" : null;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/spaces/${spaceId}/sources`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Sources
        </Link>
        {isOwner && (
          <form action={deleteSource.bind(null, spaceId, sourceId)}>
            <Button type="submit" variant="destructive">
              Delete Source
            </Button>
          </form>
        )}
      </div>

      {humanError && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {humanError}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-500 bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-200">
          Source deleted successfully
        </div>
      )}

      <SourceViewer source={source} />
    </div>
  );
}

