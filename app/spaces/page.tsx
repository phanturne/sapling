import { redirect } from "next/navigation";

import { SpaceList } from "@/components/spaces/space-list";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

type SpacesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SpacesPage({ searchParams }: SpacesPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : null;
  const success = typeof params.success === "string" ? params.success : null;

  const { data: spaces, error: spacesError } = await supabase
    .from("spaces")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (spacesError) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-destructive">Failed to load spaces</p>
      </div>
    );
  }

  const errorMessages: Record<string, string> = {
    validation_failed: "Invalid input. Please check your form data.",
    missing_title: "Title is required",
    title_too_long: "Title must be 255 characters or less",
    invalid_visibility: "Invalid visibility setting",
    create_failed: "Failed to create space",
    not_found: "Space not found",
    forbidden: "You don't have access to this space",
  };

  const humanError = error ? errorMessages[error] || "An error occurred" : null;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Spaces</h1>
          <p className="mt-2 text-muted-foreground">
            Organize your notes and sources
          </p>
        </div>
        <Link href="/spaces/new">
          <Button>Create Space</Button>
        </Link>
      </div>

      {humanError && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
          {humanError}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-500 bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-200">
          Space deleted successfully
        </div>
      )}

      <SpaceList spaces={spaces || []} />
    </div>
  );
}

