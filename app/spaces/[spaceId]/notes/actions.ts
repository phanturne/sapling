"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

function generateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

const createNoteSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
});

export async function createNote(spaceId: string, formData: FormData) {
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
    content: formData.get("content"),
  };

  const validation = createNoteSchema.safeParse(rawData);
  if (!validation.success) {
    redirect(`/spaces/${spaceId}/notes?error=validation_failed`);
  }

  const { title, content } = validation.data;

  const contentHash = generateContentHash(content);

  const { data, error } = await supabase
    .from("notes")
    .insert({
      space_id: spaceId,
      title,
      content,
      content_hash: contentHash,
      embedding_status: "pending",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    redirect(`/spaces/${spaceId}/notes?error=create_failed`);
  }

  revalidatePath(`/spaces/${spaceId}`);
  redirect(`/spaces/${spaceId}/notes/${data.id}`);
}

const updateNoteSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
});

// Internal helper that performs the actual note update
// Returns result object for use by both updateNote (redirects) and saveNote (returns result)
async function updateNoteInternal(
  spaceId: string,
  noteId: string,
  title: string,
  content: string
): Promise<
  | { success: true }
  | { success: false; error: "unauthorized" | "not_found" | "validation_failed" | "update_failed" }
> {
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

  // Verify note exists and belongs to space
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("id, content_hash")
    .eq("id", noteId)
    .eq("space_id", spaceId)
    .single();

  if (noteError || !note) {
    return { success: false, error: "not_found" };
  }

  // Validate input
  const validation = updateNoteSchema.safeParse({ title, content });
  if (!validation.success) {
    return { success: false, error: "validation_failed" };
  }

  const { title: validatedTitle, content: validatedContent } = validation.data;

  const contentHash = generateContentHash(validatedContent);
  const hashChanged = contentHash !== note.content_hash;

  const updateData: {
    title: string;
    content: string;
    content_hash: string;
    embedding_status?: string;
  } = {
    title: validatedTitle,
    content: validatedContent,
    content_hash: contentHash,
  };

  // Only update embedding_status if content hash changed
  if (hashChanged) {
    updateData.embedding_status = "pending";
  }

  const { error } = await supabase
    .from("notes")
    .update(updateData)
    .eq("id", noteId)
    .eq("space_id", spaceId);

  if (error) {
    return { success: false, error: "update_failed" };
  }

  revalidatePath(`/spaces/${spaceId}`);
  revalidatePath(`/spaces/${spaceId}/notes/${noteId}`);
  return { success: true };
}

export async function updateNote(
  spaceId: string,
  noteId: string,
  formData: FormData
) {
  const rawData = {
    title: formData.get("title"),
    content: formData.get("content"),
  };

  const result = await updateNoteInternal(
    spaceId,
    noteId,
    rawData.title as string,
    rawData.content as string
  );

  if (!result.success) {
    redirect(`/spaces/${spaceId}/notes/${noteId}?error=${result.error}`);
  }

  redirect(`/spaces/${spaceId}/notes/${noteId}?success=1`);
}

// Delete note - returns result for client components, redirects for form submissions
export async function deleteNote(
  spaceId: string,
  noteId: string
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

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("space_id", spaceId);

  if (error) {
    return { success: false, error: "delete_failed" };
  }

  revalidatePath(`/spaces/${spaceId}`);
  return { success: true };
}

// Wrapper function for client component that needs different signature
// Returns success/error instead of redirecting (for auto-save and manual save from editor)
export async function saveNote(
  spaceId: string,
  noteId: string,
  title: string,
  content: string
): Promise<{ success: true } | { success: false; error: string }> {
  return updateNoteInternal(spaceId, noteId, title, content);
}
