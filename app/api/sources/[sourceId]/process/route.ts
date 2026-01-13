import { generateEmbeddings } from "@/lib/ai/embeddings";
import { generateSourceSummary } from "@/lib/ai/summaries";
import { chunkText } from "@/lib/content/chunking";
import { extractText } from "@/lib/content/extraction";
import { createClient } from "@/utils/supabase/server";

type JsonObject = Record<string, unknown>;

function toJsonObject(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get source with space info to verify ownership
  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .select("*, spaces!inner(user_id)")
    .eq("id", sourceId)
    .single();

  if (sourceError || !source) {
    return Response.json({ error: "Source not found" }, { status: 404 });
  }

  // Verify ownership
  if (source.spaces.user_id !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Skip if already processed
  if (source.status === "ready") {
    return Response.json({ message: "Already processed" }, { status: 200 });
  }

  try {
    let textContent: string;
    let wordCount: number;

    // Extract text based on source type
    if (source.source_type === "file" && source.file_path) {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("sources")
        .download(source.file_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const fileType = source.file_type || "text/plain";

      // Extract text synchronously (all file types including PDFs)
      const extracted = await extractText(buffer, fileType);
      textContent = extracted.text;
      wordCount = extracted.metadata.wordCount;
    } else if (source.source_type === "url" && source.source_url) {
      // For URL sources, fetch and extract text
      // Simple implementation: fetch HTML and extract text
      const response = await fetch(source.source_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const html = await response.text();
      // Simple HTML text extraction (strip tags)
      textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      wordCount = textContent.split(/\s+/).filter(Boolean).length;
    } else if (source.source_type === "text" && source.content) {
      textContent = source.content;
      wordCount = textContent.split(/\s+/).filter(Boolean).length;
    } else {
      throw new Error("Invalid source type or missing content");
    }

    // Update source with extracted content
    const existingMetadata = toJsonObject(source.metadata);
    await supabase
      .from("sources")
      .update({
        content: textContent,
        metadata: { ...existingMetadata, wordCount },
      })
      .eq("id", sourceId);

    // Chunk the text
    const chunks = chunkText(textContent);

    if (chunks.length === 0) {
      throw new Error("No content to process");
    }

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    // Prepare chunk records for insertion
    const chunkRecords = chunks.map((chunk, index) => ({
      source_id: sourceId,
      content: chunk.content,
      chunk_index: chunk.chunkIndex,
      token_count: chunk.tokenCount,
      embedding: JSON.stringify(embeddings[index].embedding),
      metadata: {},
    }));

    // Delete existing chunks (in case of reprocessing)
    await supabase.from("source_chunks").delete().eq("source_id", sourceId);

    // Insert new chunks
    const { error: insertError } = await supabase
      .from("source_chunks")
      .insert(chunkRecords);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // Generate summary (non-blocking - if it fails, source is still ready)
    try {
      const summaryResult = await generateSourceSummary(textContent, source.title);
      
      // Insert or update summary
      await supabase
        .from("source_summaries")
        .upsert({
          source_id: sourceId,
          summary: summaryResult.summary,
          key_points: summaryResult.keyPoints,
          topics: summaryResult.topics,
          word_count: wordCount,
        });
    } catch (summaryError) {
      // Log but don't fail the entire processing
      console.error("Summary generation failed:", summaryError);
    }

    // Update source status to ready
    await supabase
      .from("sources")
      .update({
        status: "ready",
        metadata: {
          ...existingMetadata,
          wordCount,
          chunkCount: chunks.length,
          processedAt: new Date().toISOString(),
        },
      })
      .eq("id", sourceId);

    return Response.json({
      success: true,
      chunks: chunks.length,
      wordCount,
    });
  } catch (error) {
    console.error("Processing error:", error);

    // Update source status to error
    const errorMetadata = toJsonObject(source.metadata);
    await supabase
      .from("sources")
      .update({
        status: "error",
        metadata: {
          ...errorMetadata,
          error: error instanceof Error ? error.message : "Unknown error",
          failedAt: new Date().toISOString(),
        },
      })
      .eq("id", sourceId);

    return Response.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}

