"use client";

import { useState } from "react";

import { SourcePanel } from "@/components/sources/source-panel";
import { SpaceStudyPanel } from "@/components/spaces/space-study-panel";
import type { Database } from "@/supabase/types";

type Source = Database["public"]["Tables"]["sources"]["Row"];

// Source list item - excludes content field for performance (content can be huge)
type SourceListItem = Omit<Source, "content">;

type SpacePanelsProps = {
  sources: SourceListItem[];
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

export function SpacePanels({
  sources,
  spaceId,
  selectedSource,
  isOwner,
  onUpload,
  deleteSourceAction,
}: SpacePanelsProps) {
  const [sourcePanelMaximized, setSourcePanelMaximized] = useState(false);
  const [studyPanelMaximized, setStudyPanelMaximized] = useState(false);

  const handleSourceMaximize = () => {
    setSourcePanelMaximized(true);
    setStudyPanelMaximized(false);
  };

  const handleSourceRestore = () => {
    setSourcePanelMaximized(false);
  };

  const handleStudyMaximize = () => {
    setStudyPanelMaximized(true);
    setSourcePanelMaximized(false);
  };

  const handleStudyRestore = () => {
    setStudyPanelMaximized(false);
  };

  // Determine visibility based on maximize states
  const showSourcePanel = !studyPanelMaximized;
  const showStudyPanel = !sourcePanelMaximized;

  return (
    <div className="flex min-h-0 flex-1 gap-2 p-2 pt-0">
      {/* First panel: sources + source content */}
      {showSourcePanel && (
        <div className="flex min-w-0 flex-1 flex-col">
          <SourcePanel
            sources={sources}
            spaceId={spaceId}
            selectedSource={selectedSource}
            isOwner={!!isOwner}
            onUpload={onUpload}
            deleteSourceAction={deleteSourceAction}
            isMaximized={sourcePanelMaximized}
            onMaximize={handleSourceMaximize}
            onRestore={handleSourceRestore}
          />
        </div>
      )}

      {/* Second panel: tabs (Lessons, Chat, Flashcards) */}
      {showStudyPanel && (
        <div className="flex min-w-0 flex-1 flex-col">
          <SpaceStudyPanel
            isMaximized={studyPanelMaximized}
            onMaximize={handleStudyMaximize}
            onRestore={handleStudyRestore}
          />
        </div>
      )}
    </div>
  );
}

