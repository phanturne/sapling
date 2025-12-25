"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const displayName = (formData.get("display_name") as string | null)?.trim();
  const username = (formData.get("username") as string | null)?.trim();

  if (!displayName || !username) {
    redirect("/profile?error=missing_fields");
  }

  // Ensure username is unique (excluding current user)
  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (existingError) {
    redirect("/profile?error=profile_lookup_failed");
  }

  if (existing) {
    redirect("/profile?error=username_taken");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username,
    })
    .eq("id", user.id);

  if (updateError) {
    redirect("/profile?error=update_failed");
  }

  revalidatePath("/profile");
  redirect("/profile?success=1");
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const file = formData.get("avatar");

  if (!file || !(file instanceof File)) {
    redirect("/profile?error=no_file");
  }

  if (!file.type.startsWith("image/")) {
    redirect("/profile?error=invalid_file_type");
  }

  const fileName = file.name;
  const fileExt = fileName.includes(".")
    ? (fileName.split(".").pop() ?? "png")
    : "png";
  const path = `${user.id}/${Date.now()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError || !uploadData) {
    redirect("/profile?error=upload_failed");
  }

  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(uploadData.path);

  const avatarUrl = publicUrlData?.publicUrl ?? uploadData.path;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
    })
    .eq("id", user.id);

  if (updateError) {
    redirect("/profile?error=avatar_update_failed");
  }

  revalidatePath("/profile");
  redirect("/profile?success=1");
}
