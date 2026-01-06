"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ["application/pdf", "text/plain", "text/markdown"];

const uploadFileSourceSchema = z.object({
  title: z.string().optional(),
  source_type: z.literal("file"),
});

const uploadUrlSourceSchema = z.object({
  title: z.string().optional(),
  source_type: z.literal("url"),
  url: z.string().url().refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    { message: "Invalid URL" }
  ),
});

// Upload source - returns result for client components
export async function uploadSource(
  spaceId: string,
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "unauthorized" };
  }

  // Verify user owns the space
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, user_id")
    .eq("id", spaceId)
    .single();

  if (spaceError || !space || space.user_id !== user.id) {
    return { success: false, error: "not_found" };
  }

  const sourceType = (formData.get("source_type") as string | null) || "file";

  if (sourceType === "file") {
    const file = formData.get("file");
    const rawData = {
      title: formData.get("title"),
      source_type: "file" as const,
    };

    // Validate basic schema
    const validation = uploadFileSourceSchema.safeParse(rawData);
    if (!validation.success) {
      return { success: false, error: "validation_failed" };
    }

    // Validate file separately (Zod can't validate File from FormData directly)
    if (!file || !(file instanceof File)) {
      return { success: false, error: "no_file" };
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return { success: false, error: "invalid_file_type" };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "file_too_large" };
    }

    const { title } = validation.data;

    const fileName = file.name;
    const fileExt = fileName.includes(".")
      ? (fileName.split(".").pop() ?? "pdf")
      : "pdf";
    const filePath = `${user.id}/${spaceId}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("sources")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError || !uploadData) {
      return { success: false, error: "upload_failed" };
    }

    const sourceTitle = title || fileName;

    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .insert({
        space_id: spaceId,
        title: sourceTitle,
        source_type: "file",
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        status: "processing",
      })
      .select()
      .single();

    if (sourceError) {
      // Clean up uploaded file
      await supabase.storage.from("sources").remove([uploadData.path]);
      return { success: false, error: "create_failed" };
    }

    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/sources`);
    return { success: true };
  } else if (sourceType === "url") {
    const rawData = {
      title: formData.get("title"),
      source_type: "url" as const,
      url: formData.get("url"),
    };

    const validation = uploadUrlSourceSchema.safeParse(rawData);
    if (!validation.success) {
      return { success: false, error: "invalid_url" };
    }

    const { title, url } = validation.data;
    const sourceTitle = title || url;

    const { data: source, error: sourceError } = await supabase
      .from("sources")
      .insert({
        space_id: spaceId,
        title: sourceTitle,
        source_type: "url",
        source_url: url,
        status: "processing",
      })
      .select()
      .single();

    if (sourceError) {
      return { success: false, error: "create_failed" };
    }

    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/sources`);
    return { success: true };
  } else {
    return { success: false, error: "invalid_source_type" };
  }
}

export async function deleteSource(spaceId: string, sourceId: string) {
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

  // Get source to check for file_path
  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("id, file_path")
    .eq("id", sourceId)
    .eq("space_id", spaceId)
    .single();

  if (sourceError || !source) {
    redirect(`/spaces/${spaceId}/sources?error=not_found`);
  }

  // Delete file from storage if it exists
  if (source.file_path) {
    await supabase.storage.from("sources").remove([source.file_path]);
  }

  const { error } = await supabase
    .from("sources")
    .delete()
    .eq("id", sourceId)
    .eq("space_id", spaceId);

  if (error) {
    redirect(`/spaces/${spaceId}/sources?error=delete_failed`);
  }

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/sources`);
  redirect(`/spaces/${spaceId}/sources?success=deleted`);
}

