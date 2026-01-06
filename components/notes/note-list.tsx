import Link from "next/link";

import type { Database } from "@/supabase/types";

type Note = Database["public"]["Tables"]["notes"]["Row"];

type NoteListProps = {
  notes: Note[];
  spaceId: string;
};

export function NoteList({ notes, spaceId }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">No notes yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <Link
          key={note.id}
          href={`/spaces/${spaceId}/notes/${note.id}`}
          className="block rounded-md border bg-card p-4 transition-colors hover:bg-accent"
        >
          <h3 className="font-semibold text-foreground">{note.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {note.content.substring(0, 150)}
            {note.content.length > 150 ? "..." : ""}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {new Date(note.updated_at).toLocaleDateString()}
            </span>
            {note.embedding_status && (
              <span
                className={`rounded-full px-2 py-0.5 ${
                  note.embedding_status === "ready"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : note.embedding_status === "processing"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {note.embedding_status}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

