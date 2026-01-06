"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type SourceUploadProps = {
  onUpload: (
    formData: FormData
  ) => Promise<{ success: true } | { success: false; error: string }>;
  spaceId: string;
};

export function SourceUpload({ onUpload, spaceId }: SourceUploadProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [sourceType, setSourceType] = useState<"file" | "url">("file");
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("source_type", sourceType);

    try {
      const result = await onUpload(formData);
      if (result.success) {
        // Reset form before navigation
        formRef.current?.reset();
        // Navigate to sources page with success message
        router.push(`/spaces/${spaceId}/sources?success=1`);
      } else {
        console.error("Upload failed:", result.error);
        // Navigate with error message
        router.push(`/spaces/${spaceId}/sources?error=${result.error}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      // Navigate with error message for unexpected exceptions
      router.push(`/spaces/${spaceId}/sources?error=upload_failed`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-xl font-semibold">Add Source</h2>

      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          variant={sourceType === "file" ? "default" : "outline"}
          onClick={() => setSourceType("file")}
        >
          Upload File
        </Button>
        <Button
          type="button"
          variant={sourceType === "url" ? "default" : "outline"}
          onClick={() => setSourceType("url")}
        >
          Add URL
        </Button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Title (optional)
          </label>
          <Input
            id="title"
            name="title"
            type="text"
            placeholder={sourceType === "file" ? "File name" : "Source title"}
            className="w-full"
          />
        </div>

        {sourceType === "file" ? (
          <div>
            <label
              htmlFor="file"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              File (PDF, TXT, MD - max 10MB)
            </label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.txt,.md"
              required
              className="w-full"
            />
          </div>
        ) : (
          <div>
            <label
              htmlFor="url"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              URL
            </label>
            <Input
              id="url"
              name="url"
              type="url"
              required
              placeholder="https://example.com/article"
              className="w-full"
            />
          </div>
        )}

        <Button type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : sourceType === "file" ? "Upload" : "Add URL"}
        </Button>
      </form>
    </div>
  );
}


