/*
 * SplitView — 50/50 list + map layout for the desktop catalog
 * (Phase 4B, Arash).
 *
 * Hover sync is coordinated at this level:
 *   list ↔ (hoveredId state) ↔ map
 *
 * The list side owns its own scroll; the map owns its own pan/zoom. A
 * single `hoveredId` lives here so neither child re-renders the whole
 * tree — GrantList scrolls the matching row into view; MapPanel toggles
 * the marker's highlight class (see MapPanel's `highlightedId` prop).
 *
 * Note on height: this component assumes its parent has already accounted
 * for the Navbar/toolbar/chips/stats offsets and given it `h-full` or an
 * explicit height. The grid below just occupies that space.
 */

import { useState } from "react";
import GrantList from "@/components/GrantList";
import MapPanel, { type MapPanelGrant } from "@/components/MapPanel";
import type { CatalogItem } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface SplitViewProps {
  grants: CatalogItem[];
  onCardClick: (item: CatalogItem) => void;
  onMarkerClick: (item: CatalogItem) => void;
  onMapReady?: (map: google.maps.Map) => void;
  className?: string;
  emptyLabel?: string;
}

export default function SplitView({
  grants,
  onCardClick,
  onMarkerClick,
  onMapReady,
  className,
  emptyLabel,
}: SplitViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "grid h-full w-full",
        // On tablet (md–lg) the map is more useful wide, so 40/60. On large
        // desktop (lg+) go 50/50 per Airbnb split-view convention.
        "grid-cols-[40%_60%] lg:grid-cols-[50%_50%]",
        className,
      )}
    >
      <div className="relative h-full overflow-hidden border-r border-white/[0.06] bg-[#0F1419]">
        <GrantList
          grants={grants}
          highlightedId={hoveredId}
          onHoverChange={setHoveredId}
          onCardClick={onCardClick}
          emptyLabel={emptyLabel}
        />
      </div>
      <div className="relative h-full overflow-hidden">
        <MapPanel
          className="absolute inset-0 w-full h-full"
          grants={grants as unknown as MapPanelGrant[]}
          highlightedId={hoveredId}
          onHover={setHoveredId}
          onMarkerClick={(g) => {
            const match = grants.find((it) => it.id === g.id);
            if (match) onMarkerClick(match);
          }}
          onMapReady={onMapReady}
        />
      </div>
    </div>
  );
}
