"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type SourceUploadModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (
    formData: FormData
  ) => Promise<{ success: true } | { success: false; error: string }>;
  spaceId: string;
};

export function SourceUploadModal({
  open,
  onOpenChange,
  onUpload,
  spaceId,
}: SourceUploadModalProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [sourceType, setSourceType] = useState<"file" | "url">("file");
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("source_type", sourceType);

    const base = `/spaces/${spaceId}/sources`;

    try {
      const result = await onUpload(formData);
      if (result.success) {
        formRef.current?.reset();
        onOpenChange(false);
        router.refresh();
      } else {
        console.error("Upload failed:", result.error);
        router.push(`${base}?error=${result.error}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      router.push(`${base}?error=upload_failed`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sourceType === "file" ? "default" : "outline"}
              onClick={() => setSourceType("file")}
              className="flex-1"
            >
              Upload File
            </Button>
            <Button
              type="button"
              variant={sourceType === "url" ? "default" : "outline"}
              onClick={() => setSourceType("url")}
              className="flex-1"
            >
              Add URL
            </Button>
          </div>

          <div>
            <label
              htmlFor="modal-title"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Title (optional)
            </label>
            <Input
              id="modal-title"
              name="title"
              type="text"
              placeholder={sourceType === "file" ? "File name" : "Source title"}
              className="w-full"
            />
          </div>

          {sourceType === "file" ? (
            <div>
              <label
                htmlFor="modal-file"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                File (PDF, TXT, MD - max 10MB)
              </label>
              <Input
                id="modal-file"
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
                htmlFor="modal-url"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                URL
              </label>
              <Input
                id="modal-url"
                name="url"
                type="url"
                required
                placeholder="https://example.com/article"
                className="w-full"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isUploading} className="flex-1">
              {isUploading
                ? "Uploading..."
                : sourceType === "file"
                  ? "Upload"
                  : "Add URL"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

