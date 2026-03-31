import { ArrowDown, Loader2 } from "lucide-react";
import type { PullToRefreshState } from "@/hooks/usePullToRefresh";

interface PullToRefreshIndicatorProps {
  state: PullToRefreshState;
  pullDistance: number;
  progress: number;
}

/**
 * Visual indicator for pull-to-refresh gesture.
 * Shows an arrow that rotates as you pull, then a spinner while refreshing.
 */
export default function PullToRefreshIndicator({
  state,
  pullDistance,
  progress,
}: PullToRefreshIndicatorProps) {
  if (state === "idle" && pullDistance === 0) return null;

  const rotation = progress * 180; // Arrow rotates 180° as you pull
  const opacity = Math.min(progress * 1.5, 1);
  const scale = 0.5 + progress * 0.5; // Scale from 0.5 to 1

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out md:hidden"
      style={{
        height: `${pullDistance}px`,
      }}
    >
      <div
        className="flex flex-col items-center gap-1"
        style={{ opacity, transform: `scale(${scale})` }}
      >
        {state === "refreshing" ? (
          <>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground font-medium">Updating...</span>
          </>
        ) : (
          <>
            <ArrowDown
              className="w-6 h-6 text-primary transition-transform duration-150"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            <span className="text-xs text-muted-foreground font-medium">
              {state === "ready" ? "Release to refresh" : "Pull to refresh"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
