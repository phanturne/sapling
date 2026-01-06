"use client";

import { deleteNote, saveNote } from "@/app/spaces/[spaceId]/notes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NoteEditorProps = {
  noteId: string;
  spaceId: string;
  initialTitle: string;
  initialContent: string;
};

export function NoteEditor({
  noteId,
  spaceId,
  initialTitle,
  initialContent,
}: NoteEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Track last saved values to avoid unnecessary saves
  const lastSavedTitleRef = useRef(initialTitle.trim());
  const lastSavedContentRef = useRef(initialContent.trim());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  // Update refs when initial values change (e.g., switching notes)
  useEffect(() => {
    lastSavedTitleRef.current = initialTitle.trim();
    lastSavedContentRef.current = initialContent.trim();
    setTitle(initialTitle);
    setContent(initialContent);
    setLastSaved(null);
    // Clear any pending saves when switching notes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [noteId, initialTitle, initialContent]);

  // Debounced auto-save: save 3 seconds after user stops typing
  useEffect(() => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    
    // Check if values have actually changed
    const hasChanges = 
      trimmedTitle !== lastSavedTitleRef.current ||
      trimmedContent !== lastSavedContentRef.current;
    
    // Only set up auto-save if:
    // 1. Both fields have content
    // 2. Values have changed from last saved
    if (trimmedTitle && trimmedContent && hasChanges) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        // Use ref to check saving state (avoids stale closure)
        if (isSavingRef.current) return;
        
        // Re-check values haven't changed
        const finalTitle = title.trim();
        const finalContent = content.trim();
        const stillHasChanges = 
          finalTitle !== lastSavedTitleRef.current ||
          finalContent !== lastSavedContentRef.current;
        
        if (stillHasChanges && !isSavingRef.current) {
          setIsSaving(true);
          try {
            const result = await saveNote(spaceId, noteId, finalTitle, finalContent);
            if (result.success) {
              lastSavedTitleRef.current = finalTitle;
              lastSavedContentRef.current = finalContent;
              setLastSaved(new Date());
            } else {
              console.error("Auto-save failed:", result.error);
            }
          } catch (error) {
            console.error("Auto-save failed:", error);
          } finally {
            setIsSaving(false);
          }
        }
      }, 3000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [title, content, spaceId, noteId]);

  const handleManualSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    
    if (!trimmedTitle || !trimmedContent) return;

    setIsSaving(true);
    try {
      const result = await saveNote(spaceId, noteId, trimmedTitle, trimmedContent);
      if (result.success) {
        lastSavedTitleRef.current = trimmedTitle;
        lastSavedContentRef.current = trimmedContent;
        setLastSaved(new Date());
      } else {
        console.error("Save failed:", result.error);
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteNote(spaceId, noteId);
      if (result.success) {
        // Navigate to space page after successful delete
        router.push(`/spaces/${spaceId}?success=note_deleted`);
      } else {
        console.error("Delete failed:", result.error);
        // TODO: Show error message to user
        if (result.error === "unauthorized") {
          router.push("/auth/login");
        }
      }
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between border-b pb-4">
        <div className="flex-1">
          <label htmlFor="note-title" className="mb-2 block text-sm font-medium text-foreground">
            Title
          </label>
          <Input
            id="note-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-xl font-semibold"
            maxLength={255}
          />
        </div>
        <div className="ml-4 flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          {lastSaved && !isSaving && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={handleManualSave} disabled={isSaving || isDeleting}>
            Save
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <label htmlFor="note-content" className="mb-2 block text-sm font-medium text-foreground">
          Content
        </label>
        <textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your note in Markdown..."
          className="h-full w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] font-mono"
        />
      </div>
    </div>
  );
}
