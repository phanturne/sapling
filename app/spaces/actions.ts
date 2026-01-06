"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

const createSpaceSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  visibility: z.enum(["private", "public"]).default("private"),
});

export async function createSpace(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    visibility: formData.get("visibility") || "private",
  };

  const validation = createSpaceSchema.safeParse(rawData);
  if (!validation.success) {
    redirect("/spaces?error=validation_failed");
  }

  const { title, description, visibility } = validation.data;

  const { data, error } = await supabase
    .from("spaces")
    .insert({
      title,
      description: description ?? null,
      visibility,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    redirect("/spaces?error=create_failed");
  }

  revalidatePath("/spaces");
  redirect(`/spaces/${data.id}`);
}

const updateSpaceSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  visibility: z.enum(["private", "public"]).default("private"),
});

export async function updateSpace(spaceId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Verify user owns the space
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, user_id")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space || space.user_id !== user.id) {
    redirect(`/spaces/${spaceId}?error=not_found`);
  }

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    visibility: formData.get("visibility") || "private",
  };

  const validation = updateSpaceSchema.safeParse(rawData);
  if (!validation.success) {
    redirect(`/spaces/${spaceId}?error=validation_failed`);
  }

  const { title, description, visibility } = validation.data;

  const { error } = await supabase
    .from("spaces")
    .update({
      title,
      description: description ?? null,
      visibility,
    })
    .eq("id", spaceId);

  if (error) {
    redirect(`/spaces/${spaceId}?error=update_failed`);
  }

  revalidatePath("/spaces");
  revalidatePath(`/spaces/${spaceId}`);
  redirect(`/spaces/${spaceId}?success=1`);
}

export async function deleteSpace(spaceId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Verify user owns the space
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, user_id")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space || space.user_id !== user.id) {
    redirect(`/spaces/${spaceId}?error=not_found`);
  }

  const { error } = await supabase.from("spaces").delete().eq("id", spaceId);

  if (error) {
    redirect(`/spaces/${spaceId}?error=delete_failed`);
  }

  revalidatePath("/spaces");
  redirect("/spaces?success=1");
}

