/*
 * CatalogCardSkeleton — Animated placeholder matching CatalogCard layout
 * Displays a shimmer effect while grant data is loading.
 */

interface CatalogCardSkeletonProps {
  /** Stagger delay index for cascading animation */
  index?: number;
}

export default function CatalogCardSkeleton({ index = 0 }: CatalogCardSkeletonProps) {
  const delay = Math.min(index * 60, 300);

  return (
    <div
      className="bg-card border border-border/80 rounded-lg border-l-4 border-l-gray-200 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-5">
        {/* Header: Flag + Name + Category badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {/* Flag placeholder */}
            <div className="w-6 h-6 rounded-full bg-muted shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {/* Name */}
              <div className="h-4 bg-muted rounded-md w-3/4 mb-2" />
              {/* Organization */}
              <div className="h-3 bg-muted rounded-md w-1/2" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {/* Category badge */}
            <div className="h-6 w-20 bg-muted rounded-full" />
            {/* Type badge */}
            <div className="h-4 w-14 bg-muted rounded" />
          </div>
        </div>

        {/* Description lines */}
        <div className="space-y-2 mb-3">
          <div className="h-3.5 bg-muted rounded-md w-full" />
          <div className="h-3.5 bg-muted rounded-md w-5/6" />
        </div>

        {/* Meta row: Location + Amount + Deadline */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3">
          <div className="h-4 w-20 bg-muted rounded-md" />
          <div className="h-4 w-16 bg-muted rounded-md" />
          <div className="h-4 w-24 bg-muted rounded-md" />
        </div>

        {/* Eligibility */}
        <div className="space-y-1.5 mb-4">
          <div className="h-3 bg-secondary rounded-md w-full" />
          <div className="h-3 bg-secondary rounded-md w-4/5" />
        </div>

        {/* Contact links */}
        <div className="flex items-center gap-3">
          <div className="h-4 w-24 bg-muted rounded-md" />
          <div className="h-4 w-16 bg-secondary rounded-md" />
        </div>
      </div>
    </div>
  );
}
