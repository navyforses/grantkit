import { useCallback, useEffect, useRef, useState } from "react";

export type PullToRefreshState = "idle" | "pulling" | "ready" | "refreshing";

interface UsePullToRefreshOptions {
  /** Async function to call when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Distance in px the user must pull to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull distance in px (default: 140) */
  maxPull?: number;
  /** Whether the feature is enabled (default: true) — use to disable on desktop */
  enabled?: boolean;
}

interface UsePullToRefreshReturn {
  /** Current state of the pull-to-refresh gesture */
  state: PullToRefreshState;
  /** Current pull distance in px (0 when idle/refreshing) */
  pullDistance: number;
  /** Progress from 0 to 1 based on threshold */
  progress: number;
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Custom hook that implements native-feeling pull-to-refresh gesture.
 * Attach `containerRef` to the scrollable container element.
 * Only activates when the container is scrolled to the top.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 140,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [state, setState] = useState<PullToRefreshState>("idle");
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Refs for gesture tracking (avoid re-renders during touch move)
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);
  const isRefreshing = useRef(false);

  const progress = Math.min(pullDistance / threshold, 1);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setState("refreshing");
    setPullDistance(threshold * 0.6); // Hold at a smaller distance while refreshing

    try {
      await onRefresh();
    } catch {
      // Silently handle errors — the UI will reset regardless
    }

    // Animate back to 0
    setPullDistance(0);
    setState("idle");
    isRefreshing.current = false;
  }, [onRefresh, threshold]);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing.current) return;

      // Only start pull if scrolled to the very top
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 5) return;

      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;
      isPulling.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing.current) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      // Only activate if pulling down and at the top
      if (deltaY <= 0 || scrollTop > 5) {
        if (isPulling.current) {
          isPulling.current = false;
          setPullDistance(0);
          setState("idle");
        }
        return;
      }

      // Start tracking the pull
      if (!isPulling.current && deltaY > 10) {
        isPulling.current = true;
        startY.current = currentY.current; // Reset start to avoid jump
      }

      if (isPulling.current) {
        // Apply rubber-band resistance: the further you pull, the harder it gets
        const rawDelta = currentY.current - startY.current;
        const resistance = Math.max(0.3, 1 - rawDelta / (maxPull * 2.5));
        const distance = Math.min(rawDelta * resistance, maxPull);

        setPullDistance(distance);
        setState(distance >= threshold ? "ready" : "pulling");

        // Prevent native scroll while pulling
        if (distance > 5) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current || isRefreshing.current) return;

      isPulling.current = false;
      const finalDistance = currentY.current - startY.current;
      const resistance = Math.max(0.3, 1 - finalDistance / (maxPull * 2.5));
      const distance = Math.min(finalDistance * resistance, maxPull);

      if (distance >= threshold) {
        handleRefresh();
      } else {
        // Snap back
        setPullDistance(0);
        setState("idle");
      }
    };

    // Use passive: false on touchmove so we can preventDefault
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, threshold, maxPull, handleRefresh]);

  return { state, pullDistance, progress, containerRef };
}
