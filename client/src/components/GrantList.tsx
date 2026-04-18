/*
 * GrantList — virtualized list of CatalogCardCompact rows (Phase 4B, Arash).
 *
 * Uses react-window's <List> so 600+ grants render without frame drops.
 * Exposes two-way hover sync:
 *   · onHoverChange(id | null) — emits when a card is pointer-entered/left,
 *     debounced 50 ms to avoid thrashing the map's DOM when sliding the
 *     cursor across the list.
 *   · highlightedId — external signal (from the map) that scrolls the
 *     matching row into view and tints it.
 *
 * Row height is fixed (96 px: 92 px card + 4 px inter-row margin) so
 * react-window can fast-path the scroll offset math.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { CSSProperties } from "react";
import { List, type ListImperativeAPI } from "react-window";
import CatalogCardCompact from "@/components/CatalogCardCompact";
import type { CatalogItem } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 96; // 92 px card + 4 px bottom margin
const HOVER_DEBOUNCE_MS = 50;

export interface GrantListProps {
  grants: CatalogItem[];
  highlightedId?: string | null;
  onHoverChange?: (id: string | null) => void;
  onCardClick: (item: CatalogItem) => void;
  className?: string;
  emptyLabel?: string;
}

interface RowProps {
  grants: CatalogItem[];
  highlightedId: string | null;
  onHoverChange?: (id: string | null) => void;
  onCardClick: (item: CatalogItem) => void;
}

function Row({
  index,
  style,
  grants,
  highlightedId,
  onHoverChange,
  onCardClick,
  ariaAttributes,
}: {
  index: number;
  style: CSSProperties;
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
} & RowProps) {
  const item = grants[index];
  if (!item) return null;
  const isHi = item.id === highlightedId;
  return (
    <div style={style} {...ariaAttributes} className="px-3 pb-1">
      <CatalogCardCompact
        item={item}
        highlighted={isHi}
        onHoverChange={onHoverChange}
        onClick={onCardClick}
      />
    </div>
  );
}

export default function GrantList({
  grants,
  highlightedId = null,
  onHoverChange,
  onCardClick,
  className,
  emptyLabel = "No grants match these filters.",
}: GrantListProps) {
  const listRef = useRef<ListImperativeAPI | null>(null);

  // Debounced hover emitter — avoids firing every frame when the cursor
  // slides across stacked rows.
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHoverChangeRef = useRef(onHoverChange);
  onHoverChangeRef.current = onHoverChange;

  const emitHover = useCallback((id: string | null) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      onHoverChangeRef.current?.(id);
    }, HOVER_DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    },
    [],
  );

  // When an external highlight (from the map) changes, bring that row into view.
  useEffect(() => {
    if (!highlightedId || !listRef.current) return;
    const idx = grants.findIndex((g) => g.id === highlightedId);
    if (idx < 0) return;
    listRef.current.scrollToRow({
      index: idx,
      align: "smart",
      behavior: "smooth",
    });
  }, [highlightedId, grants]);

  const rowProps = useMemo<RowProps>(
    () => ({
      grants,
      highlightedId: highlightedId ?? null,
      onHoverChange: emitHover,
      onCardClick,
    }),
    [grants, highlightedId, emitHover, onCardClick],
  );

  if (grants.length === 0) {
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center text-sm text-white/40 px-6",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full pt-1", className)}>
      <List
        listRef={listRef}
        rowCount={grants.length}
        rowHeight={ROW_HEIGHT}
        rowProps={rowProps}
        rowComponent={Row}
        overscanCount={6}
        className="scrollbar-thin"
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
