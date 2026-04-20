/*
 * GrantGrid — responsive tile grid for the standalone List view.
 *
 * Renders CatalogCardTile in a 3/2/1 column grid. Unlike GrantList
 * (virtualized sidebar), this grid simply maps every grant to a tile;
 * the page's outer scroll container handles overflow. If the catalog
 * grows beyond a few thousand rows we can swap in a windowed grid
 * later — for the current ~640 rows plain rendering is fine.
 */

import CatalogCardTile from "@/components/CatalogCardTile";
import type { CatalogItem } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface GrantGridProps {
  grants: CatalogItem[];
  onCardClick: (item: CatalogItem) => void;
  className?: string;
  emptyLabel?: string;
}

export default function GrantGrid({
  grants,
  onCardClick,
  className,
  emptyLabel = "No grants match these filters.",
}: GrantGridProps) {
  if (grants.length === 0) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center px-6 text-sm text-white/40",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-full w-full overflow-y-auto scrollbar-thin",
        className,
      )}
    >
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
        {grants.map((item) => (
          <CatalogCardTile key={item.id} item={item} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}
