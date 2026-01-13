"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type SourceListPollingProps = {
  hasProcessingSources: boolean;
  pollInterval?: number;
  children: React.ReactNode;
};

/**
 * Wrapper component that polls for source updates when sources are processing
 * - Polls database status via router.refresh() to check for status changes
 */
export function SourceListPolling({
  hasProcessingSources,
  pollInterval = 5000,
  children,
}: SourceListPollingProps) {
  const router = useRouter();

  useEffect(() => {
    // Don't poll if no sources are processing
    if (!hasProcessingSources) return;

    // Set up interval to refresh database status
    const intervalId = setInterval(() => {
      router.refresh();
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [hasProcessingSources, pollInterval, router]);

  return <>{children}</>;
}
