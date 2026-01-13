import { google } from "@ai-sdk/google";
import { embedMany } from "ai";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 1536; // Match database VECTOR(1536)
const BATCH_SIZE = 100; // Max texts per batch for Gemini

export type EmbeddingResult = {
  embedding: number[];
  index: number;
};

/**
 * Generate embeddings for an array of text chunks
 * Processes in batches to avoid rate limits
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  // Process in batches
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const { embeddings } = await embedMany({
      model: google.embeddingModel(EMBEDDING_MODEL),
      values: batch,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      },
    });

    // Map embeddings to results with original indices
    for (let j = 0; j < embeddings.length; j++) {
      results.push({
        embedding: embeddings[j],
        index: i + j,
      });
    }
  }

  return results;
}

/**
 * Generate a single embedding for a text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const results = await generateEmbeddings([text]);
  return results[0].embedding;
}

