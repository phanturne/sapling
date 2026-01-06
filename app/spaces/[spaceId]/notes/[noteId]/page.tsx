import Link from "next/link";
import { redirect } from "next/navigation";

import { NoteEditor } from "@/components/notes/note-editor";
import { createClient } from "@/utils/supabase/server";

type NotePageProps = {
  params: Promise<{ spaceId: string; noteId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NotePage({
  params,
  searchParams,
}: NotePageProps) {
  const supabase = await createClient();
  const { spaceId, noteId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Verify user has access to space
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, user_id, visibility")
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

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("space_id", spaceId)
    .single();

  if (noteError || !note) {
    redirect(`/spaces/${spaceId}?error=note_not_found`);
  }

  const isOwner = user && space.user_id === user.id;

  const params_search = (await searchParams) ?? {};
  const error = typeof params_search.error === "string" ? params_search.error : null;
  const success = typeof params_search.success === "string" ? params_search.success : null;

  const errorMessages: Record<string, string> = {
    validation_failed: "Invalid input. Please check your form data.",
    missing_title: "Title is required",
    title_too_long: "Title must be 255 characters or less",
    missing_content: "Content is required",
    update_failed: "Failed to update note",
    delete_failed: "Failed to delete note",
    not_found: "Note not found",
    note_not_found: "Note not found",
  };

  const humanError = error ? errorMessages[error] || "An error occurred" : null;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link
          href={`/spaces/${spaceId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Space
        </Link>
      </div>

      {humanError && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {humanError}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-500 bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-200">
          Note updated successfully
        </div>
      )}

      {isOwner ? (
        <NoteEditor
          noteId={noteId}
          spaceId={spaceId}
          initialTitle={note.title}
          initialContent={note.content}
        />
      ) : (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{note.title}</h1>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <pre className="whitespace-pre-wrap font-sans">{note.content}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

