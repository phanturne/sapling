import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { createNote } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NewNotePageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewNotePage({
  params,
  searchParams,
}: NewNotePageProps) {
  const supabase = await createClient();
  const { spaceId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Verify user owns the space
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, user_id, title")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space || space.user_id !== user.id) {
    redirect("/spaces?error=not_found");
  }

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
      <div className="mb-6">
        <a
          href={`/spaces/${spaceId}/notes`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Notes
        </a>
        <h1 className="mt-2 text-3xl font-bold">New Note</h1>
      </div>

      {humanError && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {humanError}
        </div>
      )}

      <form action={createNote.bind(null, spaceId)} className="space-y-6">
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Title *
          </label>
          <Input
            id="title"
            name="title"
            type="text"
            required
            maxLength={255}
            placeholder="Note title..."
            className="w-full"
          />
        </div>

        <div>
          <label
            htmlFor="content"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Content * (Markdown)
          </label>
          <textarea
            id="content"
            name="content"
            rows={20}
            required
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] font-mono"
            placeholder="Start writing your note in Markdown..."
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit">Create Note</Button>
          <Button type="button" variant="outline" asChild>
            <a href={`/spaces/${spaceId}/notes`}>Cancel</a>
          </Button>
        </div>
      </form>
    </div>
  );
}

