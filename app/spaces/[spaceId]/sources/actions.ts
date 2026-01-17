"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

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

    if (sourceError || !source) {
      // Clean up uploaded file
      await supabase.storage.from("sources").remove([uploadData.path]);
      return { success: false, error: "create_failed" };
    }

    // Trigger background processing (fire-and-forget)
    triggerProcessing(source.id);

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

    if (sourceError || !source) {
      return { success: false, error: "create_failed" };
    }

    // Trigger background processing (fire-and-forget)
    triggerProcessing(source.id);

    revalidatePath(`/spaces/${spaceId}`);
    revalidatePath(`/spaces/${spaceId}/sources`);
    return { success: true };
  } else {
    return { success: false, error: "invalid_source_type" };
  }
}

/**
 * Trigger source processing in the background
 * Fire-and-forget: we don't wait for the result
 */
async function triggerProcessing(sourceId: string) {
  try {
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    // Fire-and-forget fetch to processing endpoint
    fetch(`${baseUrl}/api/sources/${sourceId}/process`, {
      method: "POST",
      headers: {
        // Forward cookies for auth
        cookie: headersList.get("cookie") || "",
      },
    }).catch((error) => {
      console.error("Failed to trigger processing:", error);
    });
  } catch (error) {
    console.error("Failed to trigger processing:", error);
  }
}

export async function deleteSource(
  spaceId: string,
  sourceId: string,
  redirectToOrFormData?: string | FormData
) {
  // When used as form action, the 3rd arg is FormData; when called from space page with .bind(spaceId, sourceId, url), it's string.
  const redirectTo =
    typeof redirectToOrFormData === "string" ? redirectToOrFormData : undefined;

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
    const errorTarget =
      redirectTo != null
        ? `${redirectTo}?error=not_found`
        : `/spaces/${spaceId}?error=not_found`;
    redirect(errorTarget);
  }

  // Get source to check for file_path
  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("id, file_path")
    .eq("id", sourceId)
    .eq("space_id", spaceId)
    .single();

  if (sourceError || !source) {
    const errorTarget =
      redirectTo != null
        ? `${redirectTo}?error=not_found`
        : `/spaces/${spaceId}/sources?error=not_found`;
    redirect(errorTarget);
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
    const errorTarget =
      redirectTo != null
        ? `${redirectTo}?error=delete_failed`
        : `/spaces/${spaceId}/sources?error=delete_failed`;
    redirect(errorTarget);
  }

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/sources`);
  const target =
    redirectTo != null
      ? `${redirectTo}?success=deleted`
      : `/spaces/${spaceId}/sources?success=deleted`;
  redirect(target);
}

