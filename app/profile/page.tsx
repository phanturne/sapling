import Image from "next/image";
import { redirect } from "next/navigation";

import { AvatarUpload } from "@/components/profile/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/server";
import { updateProfile, uploadAvatar } from "./actions";

interface ProfilePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = (await searchParams) ?? {};
  const success = params.success === "1";
  const error = typeof params.error === "string" ? params.error : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name ?? "";
  const username = profile?.username ?? "";

  const humanError =
    error === "missing_fields"
      ? "Please fill out all fields."
      : error === "username_taken"
        ? "That username is already taken."
        : error === "profile_lookup_failed"
          ? "We couldn't load your profile. Please try again."
          : error === "update_failed"
            ? "We couldn't update your profile. Please try again."
            : error === "no_file"
              ? "Please choose an image to upload."
              : error === "invalid_file_type"
                ? "Only image files are allowed."
                : error === "upload_failed"
                  ? "We couldn't upload your avatar. Please try again."
                  : error === "avatar_update_failed"
                    ? "We couldn't update your avatar. Please try again."
                    : null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-card text-card-foreground shadow-soft-lg rounded-xl border border-border p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Image
                src="/icon-circle.png"
                alt="Sapling logo"
                width={32}
                height={32}
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Your profile
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your public information and avatar.
              </p>
            </div>
          </div>

          {(success || humanError) && (
            <div
              className={`rounded-md border px-4 py-3 text-sm ${
                success
                  ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-300"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              {success ? "Profile updated successfully." : humanError}
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-[auto,1fr] items-start">
            {/* Avatar */}
            <form
              action={uploadAvatar}
              className="flex flex-col items-center gap-4"
            >
              <AvatarUpload
                initialAvatarUrl={profile?.avatar_url}
                displayName={displayName}
              />
              <Button type="submit" size="sm" className="w-full">
                Save avatar
              </Button>
            </form>

            {/* Profile details */}
            <form action={updateProfile} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="display_name"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Display name
                </label>
                <Input
                  id="display_name"
                  name="display_name"
                  defaultValue={displayName}
                  placeholder="How others will see your name"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Username
                </label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={username}
                  placeholder="your-name"
                  className="h-11"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This is your unique handle. It can only contain letters,
                  numbers, and underscores.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Email
                </label>
                <p className="text-sm text-muted-foreground">
                  {user.email ?? "No email on file"}
                </p>
              </div>

              <div className="pt-2">
                <Button type="submit" className="h-11">
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
