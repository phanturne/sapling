import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { createSpace } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type NewSpacePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewSpacePage({ searchParams }: NewSpacePageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : null;

  const errorMessages: Record<string, string> = {
    validation_failed: "Invalid input. Please check your form data.",
    missing_title: "Title is required",
    title_too_long: "Title must be 255 characters or less",
    invalid_visibility: "Invalid visibility setting",
    create_failed: "Failed to create space",
  };

  const humanError = error ? errorMessages[error] || "An error occurred" : null;

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Create New Space</h1>

      {humanError && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {humanError}
        </div>
      )}

      <form action={createSpace} className="space-y-6">
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
            placeholder="My Study Space"
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
            defaultValue="private"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>

        <div className="flex gap-4">
          <Button type="submit">Create Space</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/spaces">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

