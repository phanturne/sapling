export type Chunk = {
  content: string;
  chunkIndex: number;
  tokenCount: number;
};

// Rough token estimation: ~4 characters per token for English text
const CHARS_PER_TOKEN = 4;
const TARGET_CHUNK_TOKENS = 600; // Target tokens per chunk
const MAX_CHUNK_TOKENS = 800; // Maximum tokens per chunk
const OVERLAP_TOKENS = 100; // Overlap between chunks

const TARGET_CHUNK_CHARS = TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN;
const MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

/**
 * Estimate token count from text (rough approximation)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Split text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Split text into sentences (simple approach)
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or newline
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Chunk text into segments suitable for embedding
 *
 * Strategy:
 * 1. Split into paragraphs
 * 2. Combine paragraphs until target size reached
 * 3. If a paragraph is too large, split by sentences
 * 4. Add overlap between chunks for context continuity
 */
export function chunkText(text: string): Chunk[] {
  const paragraphs = splitIntoParagraphs(text);
  const chunks: Chunk[] = [];

  let currentChunk = "";
  let overlapText = "";

  for (const paragraph of paragraphs) {
    const paragraphLength = paragraph.length;

    // If single paragraph exceeds max, split by sentences
    if (paragraphLength > MAX_CHUNK_CHARS) {
      // Flush current chunk first
      if (currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          chunkIndex: chunks.length,
          tokenCount: estimateTokens(currentChunk),
        });
        overlapText = getOverlapText(currentChunk);
        currentChunk = "";
      }

      // Split large paragraph by sentences
      const sentences = splitIntoSentences(paragraph);
      let sentenceChunk = overlapText;

      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > MAX_CHUNK_CHARS) {
          if (sentenceChunk.trim()) {
            chunks.push({
              content: sentenceChunk.trim(),
              chunkIndex: chunks.length,
              tokenCount: estimateTokens(sentenceChunk),
            });
            overlapText = getOverlapText(sentenceChunk);
            sentenceChunk = overlapText;
          }
        }
        sentenceChunk += (sentenceChunk ? " " : "") + sentence;
      }

      // Don't lose remaining sentences
      if (sentenceChunk.trim() && sentenceChunk !== overlapText) {
        currentChunk = sentenceChunk;
      }
      continue;
    }

    // Check if adding paragraph would exceed target
    const potentialLength = currentChunk.length + paragraphLength + 2; // +2 for newlines

    if (potentialLength > TARGET_CHUNK_CHARS && currentChunk) {
      // Save current chunk and start new one with overlap
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunks.length,
        tokenCount: estimateTokens(currentChunk),
      });
      overlapText = getOverlapText(currentChunk);
      currentChunk = overlapText + "\n\n" + paragraph;
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex: chunks.length,
      tokenCount: estimateTokens(currentChunk),
    });
  }

  return chunks;
}

/**
 * Get overlap text from the end of a chunk
 */
function getOverlapText(text: string): string {
  if (text.length <= OVERLAP_CHARS) {
    return text;
  }

  // Try to break at a sentence boundary
  const endPortion = text.slice(-OVERLAP_CHARS * 1.5);
  const sentences = splitIntoSentences(endPortion);

  if (sentences.length > 1) {
    // Return last sentence(s) that fit in overlap
    let overlap = "";
    for (let i = sentences.length - 1; i >= 0; i--) {
      const potential = sentences[i] + (overlap ? " " + overlap : "");
      if (potential.length <= OVERLAP_CHARS * 1.2) {
        overlap = potential;
      } else {
        break;
      }
    }
    return overlap || text.slice(-OVERLAP_CHARS);
  }

  return text.slice(-OVERLAP_CHARS);
}

