"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { PanelCard } from "@/components/ui/panel-card";

type SpaceStudyPanelProps = {
  isMaximized?: boolean;
  onMaximize?: () => void;
  onRestore?: () => void;
};

const VALID_TABS = ["lessons", "chat", "flashcards"] as const;
type TabValue = (typeof VALID_TABS)[number];

export function SpaceStudyPanel({
  isMaximized,
  onMaximize,
  onRestore,
}: SpaceStudyPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("studyTab") ?? "lessons";
  const selectedTab = VALID_TABS.includes(currentTab as TabValue)
    ? (currentTab as TabValue)
    : "lessons";

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "lessons") {
        params.delete("studyTab");
      } else {
        params.set("studyTab", value);
      }
      const queryString = params.toString();
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <PanelCard
      tabs={[
        {
          value: "lessons",
          label: "Lessons",
          content: (
            <div className="p-4">
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                Lessons will appear here.
              </div>
            </div>
          ),
        },
        {
          value: "chat",
          label: "Chat",
          content: (
            <div className="p-4">
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                Chat will appear here.
              </div>
            </div>
          ),
        },
        {
          value: "flashcards",
          label: "Flashcards",
          content: (
            <div className="p-4">
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                Flashcards will appear here.
              </div>
            </div>
          ),
        },
      ]}
      selectedTab={selectedTab}
      onTabChange={handleTabChange}
      isMaximized={isMaximized}
      onMaximize={onMaximize}
      onRestore={onRestore}
      className="h-full"
    />
  );
}

