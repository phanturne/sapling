import Link from "next/link";
import { redirect } from "next/navigation";

import { NoteList } from "@/components/notes/note-list";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

type NotesPageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NotesPage({
  params,
  searchParams,
}: NotesPageProps) {
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

  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .select("*")
    .eq("space_id", spaceId)
    .order("updated_at", { ascending: false });

  if (notesError) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Failed to load notes</p>
      </div>
    );
  }

  const isOwner = user && space.user_id === user.id;

  const params_search = (await searchParams) ?? {};
  const error = typeof params_search.error === "string" ? params_search.error : null;

  const errorMessages: Record<string, string> = {
    validation_failed: "Invalid input. Please check your form data.",
    missing_title: "Title is required",
    title_too_long: "Title must be 255 characters or less",
    missing_content: "Content is required",
    create_failed: "Failed to create note",
  };

  const humanError = error ? errorMessages[error] || "An error occurred" : null;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/spaces/${spaceId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to {space.title}
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Notes</h1>
        </div>
        {isOwner && (
          <Link href={`/spaces/${spaceId}/notes/new`}>
            <Button>New Note</Button>
          </Link>
        )}
      </div>

      {humanError && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {humanError}
        </div>
      )}

      <NoteList notes={notes || []} spaceId={spaceId} />
    </div>
  );
}

