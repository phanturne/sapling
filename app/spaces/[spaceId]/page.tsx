import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/server";
import { deleteSpace, updateSpace } from "../actions";

type SpacePageProps = {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SpacePage({
  params,
  searchParams,
}: SpacePageProps) {
  const supabase = await createClient();
  const { spaceId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space) {
    redirect("/spaces?error=not_found");
  }

  // Check if user has access (owner or public)
  // Allow unauthenticated users to view public spaces
  if (!user && space.visibility !== "public") {
    redirect("/auth/login");
  }

  if (user && space.user_id !== user.id && space.visibility !== "public") {
    redirect("/spaces?error=forbidden");
  }

  const isOwner = user && space.user_id === user.id;

  const params_search = (await searchParams) ?? {};
  const error = typeof params_search.error === "string" ? params_search.error : null;
  const success = typeof params_search.success === "string" ? params_search.success : null;

  const errorMessages: Record<string, string> = {
    validation_failed: "Invalid input. Please check your form data.",
    missing_title: "Title is required",
    title_too_long: "Title must be 255 characters or less",
    invalid_visibility: "Invalid visibility setting",
    update_failed: "Failed to update space",
    delete_failed: "Failed to delete space",
    not_found: "Space not found",
  };

  const humanError = error ? errorMessages[error] || "An error occurred" : null;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link href="/spaces" className="text-sm text-muted-foreground hover:underline">
          ← Back to Spaces
        </Link>
      </div>

      {humanError && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {humanError}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-500 bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-200">
          Space updated successfully
        </div>
      )}

      {isOwner ? (
        <form action={updateSpace.bind(null, spaceId)} className="space-y-6">
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
              defaultValue={space.title}
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={space.description || ""}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              placeholder="A brief description of this space..."
            />
          </div>

          <div>
            <label
              htmlFor="visibility"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Visibility
            </label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={space.visibility}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div className="flex gap-4">
            <Button type="submit">Update Space</Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/spaces">Cancel</Link>
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{space.title}</h1>
          {space.description && (
            <p className="text-muted-foreground">{space.description}</p>
          )}
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                space.visibility === "public"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {space.visibility}
            </span>
          </div>
        </div>
      )}

      <div className="mt-8 border-t pt-6">
        <h2 className="mb-4 text-xl font-semibold">Content</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href={`/spaces/${spaceId}/notes`}
            className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
          >
            <h3 className="font-semibold">Notes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create and manage your notes
            </p>
          </Link>
          <Link
            href={`/spaces/${spaceId}/sources`}
            className="rounded-lg border bg-card p-6 transition-colors hover:bg-accent"
          >
            <h3 className="font-semibold">Sources</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload files and add URLs
            </p>
          </Link>
        </div>
      </div>

      {isOwner && (
        <div className="mt-8 border-t pt-6">
          <h2 className="mb-4 text-xl font-semibold text-destructive">
            Danger Zone
          </h2>
          <form action={deleteSpace.bind(null, spaceId)}>
            <Button type="submit" variant="destructive">
              Delete Space
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

