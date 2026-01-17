"use client";

import { Maximize2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

type Tab = {
  value: string;
  label: string;
  content: React.ReactNode;
};

type PanelCardProps = {
  tabs: Tab[];
  defaultTab?: string;
  selectedTab?: string;
  onTabChange?: (value: string) => void;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  isMaximized?: boolean;
  onMaximize?: () => void;
  onRestore?: () => void;
};

export function PanelCard({
  tabs,
  defaultTab,
  selectedTab: controlledSelectedTab,
  onTabChange,
  headerActions,
  footer,
  className,
  isMaximized = false,
  onMaximize,
  onRestore,
}: PanelCardProps) {
  const [internalSelectedTab, setInternalSelectedTab] = useState(
    defaultTab ?? tabs[0]?.value ?? ""
  );
  const [isHovered, setIsHovered] = useState(false);

  // Use controlled tab if provided, otherwise use internal state
  const selectedTab = controlledSelectedTab ?? internalSelectedTab;

  const handleTabChange = (value: string) => {
    if (!controlledSelectedTab) {
      setInternalSelectedTab(value);
    }
    onTabChange?.(value);
  };

  const selectedTabContent = tabs.find((tab) => tab.value === selectedTab)?.content;

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with tabs */}
      <div className="relative flex items-center justify-between border-b bg-muted px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {tabs.length === 1 ? (
            <span className="text-sm font-bold">{tabs[0].label}</span>
          ) : (
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleTabChange(tab.value)}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
                    selectedTab === tab.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {headerActions}
          {/* Hover-revealed buttons */}
          <div
            className={cn(
              "flex items-center gap-1 transition-opacity",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            {isMaximized && onRestore ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onRestore}
                className="h-7 w-7"
                title="Restore panel"
              >
                <Maximize2 className="size-4 rotate-45" />
              </Button>
            ) : onMaximize ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onMaximize}
                className="h-7 w-7"
                title="Maximize panel"
              >
                <Maximize2 className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-auto">
        {selectedTabContent}
      </div>

      {/* Optional footer */}
      {footer && (
        <div className="border-t">
          {footer}
        </div>
      )}
    </div>
  );
}

