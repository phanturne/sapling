"use client";

import { ChevronsLeft, ChevronsRight, Plus } from "lucide-react";
import { useState } from "react";

import { SourceList } from "@/components/sources/source-list";
import { SourceListPolling } from "@/components/sources/source-list-polling";
import { SourceUploadModal } from "@/components/sources/source-upload-modal";
import { SourceViewer } from "@/components/sources/source-viewer";
import { Button } from "@/components/ui/button";
import type { Database } from "@/supabase/types";

type Source = Database["public"]["Tables"]["sources"]["Row"];

type SourcePanelProps = {
  sources: Source[];
  spaceId: string;
  selectedSource: Source | null;
  isOwner: boolean;
  onUpload: (
    formData: FormData
  ) => Promise<{ success: true } | { success: false; error: string }>;
  deleteSourceAction: (
    spaceId: string,
    sourceId: string,
    redirectTo?: string
  ) => Promise<void>;
};

export function SourcePanel({
  sources,
  spaceId,
  selectedSource,
  isOwner,
  onUpload,
  deleteSourceAction,
}: SourcePanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* Single section bar: Sources */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">Sources</span>
        </div>
        {isOwner && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setModalOpen(true)}
            className="h-7 w-7 p-0"
            title="Add source"
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {/* Content area: sources list + source content */}
      <div className="relative flex min-h-0 flex-1 flex-row">
        {/* Left section: Collapsible sources list (sidebar-style) */}
        <div
          className={`flex flex-col bg-background transition-all duration-300 ${
            isOpen ? "w-[240px] border-r" : "w-0 overflow-hidden"
          }`}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-auto p-2">
            <SourceListPolling
              key={`polling-${sources.filter((s) => s.status === "processing").length}`}
              hasProcessingSources={sources.some((s) => s.status === "processing")}
            >
              <SourceList
                sources={sources}
                spaceId={spaceId}
                itemHref={(s) => `/spaces/${spaceId}?sourceId=${s.id}`}
                selectedSourceId={selectedSource?.id ?? null}
                isOwner={isOwner}
                deleteAction={
                  isOwner
                    ? (sourceId: string) =>
                        deleteSourceAction.bind(
                          null,
                          spaceId,
                          sourceId,
                          `/spaces/${spaceId}`
                        )
                    : undefined
                }
              />
            </SourceListPolling>
          </div>
        </div>

        {/* Collapse button on the divider */}
        {isOpen && (
          <div className="absolute left-[240px] top-0 z-10 flex h-full items-center -translate-x-1/2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="h-10 w-5 rounded-none rounded-r-md border border-l-0 bg-background p-0 shadow-sm hover:bg-accent hover:border-border"
              title="Collapse sources list"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
          </div>
        )}
        {!isOpen && (
          <div className="absolute left-0 top-0 z-10 flex h-full items-center">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(true)}
              className="h-10 w-5 rounded-none rounded-r-md border border-l-0 bg-background p-0 shadow-sm hover:bg-accent hover:border-border"
              title="Expand sources list"
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Right section: Source content */}
        <div className="flex min-h-0 flex-1 flex-col">
          {selectedSource ? (
            <SourceViewer source={selectedSource} />
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-muted-foreground">
              Select a source to view its content
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <SourceUploadModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onUpload={onUpload}
          spaceId={spaceId}
        />
      )}
    </div>
  );
}

