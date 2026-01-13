import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

export type ExtractionResult = {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
  };
};

/**
 * Extract text from a PDF buffer using LangChain PDFLoader
 * PDFLoader requires a file path, so we write the buffer to a temp file
 */
export async function extractFromPdf(
  buffer: Buffer
): Promise<ExtractionResult> {
  // Create a temporary file path
  const tempFilePath = join(tmpdir(), `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
  
  try {
    // Write buffer to temp file
    await writeFile(tempFilePath, buffer);

    // Use LangChain PDFLoader to extract text
    const loader = new PDFLoader(tempFilePath);
    const docs = await loader.load();

    // Combine all pages into a single text
    const text = docs.map((doc: { pageContent: string }) => doc.pageContent).join("\n\n").trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const pageCount = docs.length;

    return {
      text,
      metadata: {
        pageCount,
        wordCount,
      },
    };
  } finally {
    // Clean up temp file
    try {
      await unlink(tempFilePath);
    } catch {
      // Ignore errors during cleanup
      console.warn("Failed to delete temp file:", tempFilePath);
    }
  }
}

/**
 * Extract text from plain text or markdown buffer
 */
export function extractFromText(buffer: Buffer): ExtractionResult {
  const text = buffer.toString("utf-8").trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    text,
    metadata: {
      wordCount,
    },
  };
}

/**
 * Extract text from a file based on its MIME type
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  switch (mimeType) {
    case "application/pdf":
      return extractFromPdf(buffer);
    case "text/plain":
    case "text/markdown":
      return extractFromText(buffer);
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
