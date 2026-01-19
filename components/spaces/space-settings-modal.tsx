"use client";

import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Space = {
  title: string;
  description: string | null;
  visibility: string;
};

type SpaceSettingsModalProps = {
  space: Space;
  spaceId: string;
  updateSpace: (
    spaceId: string,
    formData: FormData
  ) => Promise<{ success: true } | { success: false; error: string }>;
  deleteSpace: (
    spaceId: string
  ) => Promise<{ success: true } | { success: false; error: string }>;
};

export function SpaceSettingsModal({
  space,
  spaceId,
  updateSpace,
  deleteSpace,
}: SpaceSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleUpdate = async (formData: FormData) => {
    const result = await updateSpace(spaceId, formData);
    if (result.success) {
      toast.success("Space updated successfully");
      router.refresh();
      setOpen(false);
    } else {
      const errorMessages: Record<string, string> = {
        validation_failed: "Invalid input. Please check your form data.",
        update_failed: "Failed to update space",
        not_found: "Space not found",
      };
      toast.error(errorMessages[result.error] || "An error occurred");
    }
  };

  const handleDelete = async () => {
    const result = await deleteSpace(spaceId);
    if (result.success) {
      toast.success("Space deleted successfully");
      router.push("/");
    } else {
      const errorMessages: Record<string, string> = {
        delete_failed: "Failed to delete space",
        not_found: "Space not found",
      };
      toast.error(errorMessages[result.error] || "An error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Space settings"
      >
        <Settings className="size-4" />
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Space settings</DialogTitle>
        </DialogHeader>

        <form action={handleUpdate} className="space-y-4">
          <div>
            <label
              htmlFor="settings-title"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Title *
            </label>
            <Input
              id="settings-title"
              name="title"
              type="text"
              required
              maxLength={255}
              defaultValue={space.title}
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="settings-description"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Description
            </label>
            <textarea
              id="settings-description"
              name="description"
              rows={3}
              defaultValue={space.description || ""}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              placeholder="A brief description of this space..."
            />
          </div>
          <div>
            <label
              htmlFor="settings-visibility"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Visibility
            </label>
            <select
              id="settings-visibility"
              name="visibility"
              defaultValue={space.visibility}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Update</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>

        <div className="mt-6 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-destructive">
            Danger zone
          </h3>
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Delete space
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

