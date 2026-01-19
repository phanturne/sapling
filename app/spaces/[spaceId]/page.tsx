import { Globe, Lock } from "lucide-react";
import Link from "next/link";

import { Navbar } from "@/components/navbar";
import { SpaceError } from "@/components/spaces/space-error";
import { SpacePanels } from "@/components/spaces/space-panels";
import { SpaceSettingsModal } from "@/components/spaces/space-settings-modal";
import { createClient } from "@/utils/supabase/server";
import { deleteSpace, updateSpace } from "../actions";
import { deleteSource, uploadSource } from "./sources/actions";

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

  const isAuthenticated = !!user;
  const returnUrl = `/spaces/${spaceId}`;

  // Space doesn't exist or user doesn't have access (combined message for security)
  if (spaceError || !space) {
    return <SpaceError isAuthenticated={isAuthenticated} returnUrl={returnUrl} />;
  }

  // Space exists but is private
  if (space.visibility !== "public") {
    // User not authenticated - show login prompt
    if (!user) {
      return <SpaceError isAuthenticated={false} returnUrl={returnUrl} />;
    }
    // User authenticated but not owner - show access denied
    if (space.user_id !== user.id) {
      return <SpaceError isAuthenticated={true} returnUrl={returnUrl} />;
    }
  }

  const isOwner = user && space.user_id === user.id;

  const { data: sourcesData, error: sourcesError } = await supabase
    .from("sources")
    .select("*")
    .eq("space_id", spaceId)
    .order("updated_at", { ascending: false });

  const sources = sourcesData ?? [];

  if (sourcesError) {
    return (
      <div className="flex flex-col">
        <Navbar
          left={
            <Link href="/spaces" className="text-sm text-muted-foreground hover:underline">
              ← Spaces
            </Link>
          }
          middle={<span className="font-semibold">{space.title}</span>}
        />
        <div className="p-4">
          <p className="text-destructive">Failed to load sources</p>
        </div>
      </div>
    );
  }

  const params_search = (await searchParams) ?? {};
  const error = typeof params_search.error === "string" ? params_search.error : null;
  const success = typeof params_search.success === "string" ? params_search.success : null;
  const sourceId = typeof params_search.sourceId === "string" ? params_search.sourceId : null;

  const selectedSource = sourceId
    ? sources.find((s) => s.id === sourceId) ?? null
    : null;

  const errorMessages: Record<string, string> = {
    validation_failed: "Invalid input. Please check your form data.",
    missing_title: "Title is required",
    title_too_long: "Title must be 255 characters or less",
    invalid_visibility: "Invalid visibility setting",
    update_failed: "Failed to update space",
    delete_failed: "Failed to delete space",
    not_found: "Space not found",
  };

  const successMessages: Record<string, string> = {
    deleted: "Source deleted",
  };

  const humanError = error ? errorMessages[error] || "An error occurred" : null;
  const humanSuccess = success ? successMessages[success] || null : null;

  return (
    <div className="flex h-dvh flex-col">
      <Navbar
        sticky
        middle={
          <div className="flex items-center gap-2">
            <span className="font-semibold">{space.title}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                space.visibility === "public"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {space.visibility === "public" ? (
                <Globe className="size-3" />
              ) : (
                <Lock className="size-3" />
              )}
              <span className="capitalize">{space.visibility}</span>
            </span>
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            {isOwner && (
              <SpaceSettingsModal
                space={{
                  title: space.title,
                  description: space.description,
                  visibility: space.visibility,
                }}
                spaceId={spaceId}
                updateSpace={updateSpace}
                deleteSpace={deleteSpace}
              />
            )}
          </div>
        }
      />

      {(humanError || humanSuccess) && (
        <div className="border-b px-4 py-2">
          {humanError && (
            <p className="text-sm text-destructive">{humanError}</p>
          )}
          {humanSuccess && (
            <p className="text-sm text-green-700 dark:text-green-300">
              {humanSuccess}
            </p>
          )}
        </div>
      )}

      <SpacePanels
        sources={sources}
        spaceId={spaceId}
        selectedSource={selectedSource}
        isOwner={!!isOwner}
        onUpload={uploadSource.bind(null, spaceId)}
        deleteSourceAction={deleteSource}
      />
    </div>
  );
}
