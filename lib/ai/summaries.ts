import { google } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";

const CHAT_MODEL = "gemini-3-flash-preview";
const MAX_CONTENT_LENGTH = 100000; // Limit content length to avoid token limits

export type SummaryResult = {
  summary: string;
  keyPoints: string[];
  topics: string[];
};

const summarySchema = z.object({
  summary: z
    .string()
    .describe("A concise summary of the content in 2-3 sentences"),
  keyPoints: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("3-5 key points extracted from the content"),
  topics: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("3-5 main topics or themes present in the content"),
});

/**
 * Generate a summary, key points, and topics for source content
 * Uses Gemini to analyze the content and extract structured information
 * Uses AI SDK's structured output for type-safe, validated results
 */
export async function generateSourceSummary(
  content: string,
  title?: string
): Promise<SummaryResult> {
  // Truncate content if too long to avoid token limits
  const truncatedContent =
    content.length > MAX_CONTENT_LENGTH
      ? content.substring(0, MAX_CONTENT_LENGTH) + "..."
      : content;

  const prompt = `Analyze the following content and provide a summary, key points, and topics.

${title ? `Title: ${title}\n\n` : ""}Content:
${truncatedContent}`;

  try {
    const { output } = await generateText({
      model: google(CHAT_MODEL),
      output: Output.object({
        schema: summarySchema,
      }),
      prompt,
      temperature: 0.3, // Lower temperature for more consistent summaries
    });

    return {
      summary: output.summary.trim(),
      keyPoints: output.keyPoints.map((p) => p.trim()).filter((p) => p.length > 0),
      topics: output.topics.map((t) => t.trim()).filter((t) => t.length > 0),
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error("Summary generation error - no object generated:", error);
      console.error("Cause:", error.cause);
      console.error("Text:", error.text);
    } else {
      console.error("Summary generation error:", error);
    }

    // Fallback: generate a simple summary from first paragraph
    const firstParagraph = content.split("\n\n")[0]?.trim() || content.substring(0, 500);
    return {
      summary: firstParagraph.length > 500 ? firstParagraph.substring(0, 500) + "..." : firstParagraph,
      keyPoints: [],
      topics: [],
    };
  }
}

