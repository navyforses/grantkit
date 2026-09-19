/*
 * PageFallback — skeleton shown while a lazy route chunk downloads or a
 * detail page waits for its tRPC data (Phase 1.7). Replaces the blank
 * background div so mobile users see structure instead of an empty
 * screen. Layout mirrors the detail pages: header bar, title, stat
 * strip, two content cards.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function PageFallback() {
  return (
    <div className="min-h-screen bg-background" role="status" aria-busy="true" data-testid="page-fallback">
      <div className="h-14 border-b border-border/60 px-4 flex items-center gap-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="container px-4 py-6 space-y-5 max-w-3xl">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}
