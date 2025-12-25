"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface AvatarUploadProps {
  initialAvatarUrl?: string | null;
  displayName?: string | null;
}

export function AvatarUpload({
  initialAvatarUrl,
  displayName,
}: AvatarUploadProps) {
  // Local preview only for newly selected file; falls back to initialAvatarUrl when not set
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  // Revoke object URLs when they are no longer needed to avoid memory leaks
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const initials =
    displayName
      ?.split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || "?";

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setLocalPreviewUrl(url);
  }

  const previewUrl = localPreviewUrl ?? initialAvatarUrl ?? null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-24 w-24 overflow-hidden rounded-full border border-border bg-muted">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Profile avatar preview"
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted-foreground">
            {initials}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <label className="cursor-pointer">
          <input
            type="file"
            name="avatar"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button type="button" size="sm" variant="outline">
            Change avatar
          </Button>
        </label>
        <p className="text-xs text-muted-foreground text-center">
          PNG, JPG, or GIF. Recommended size 256x256px.
        </p>
      </div>
    </div>
  );
}
