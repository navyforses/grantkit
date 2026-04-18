/*
 * QuickChips — horizontally scrollable row of category shortcut chips
 * (Phase 4A, Priya). Sits directly below the CatalogToolbar and lets
 * users jump to a popular category with a single tap. Clicking the
 * active chip deselects it. The active chip auto-scrolls into view on
 * mount so deep-linked filters remain visible.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface QuickChip {
  id: string;
  label: string;
  count: number;
  icon?: string;
}

export interface QuickChipsProps {
  categories: QuickChip[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  ariaLabel?: string;
}

export default function QuickChips({
  categories,
  activeId,
  onSelect,
  ariaLabel = "Quick category filters",
}: QuickChipsProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Scroll the active chip into view when activeId changes (including on mount).
  useEffect(() => {
    if (!activeRef.current || !scrollerRef.current) return;
    activeRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeId]);

  if (categories.length === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className="border-b border-white/[0.06] bg-[#0F1419]"
    >
      <div
        ref={scrollerRef}
        className={cn(
          "flex items-center gap-2 px-6 py-2.5",
          "overflow-x-auto scrollbar-hide",
          "snap-x snap-mandatory",
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {categories.map((c) => {
          const active = activeId === c.id;
          return (
            <button
              key={c.id}
              ref={active ? activeRef : undefined}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : c.id)}
              className={cn(
                "shrink-0 snap-start",
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[14px]",
                "text-[12px] font-medium whitespace-nowrap",
                "border transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/60",
                active
                  ? "bg-[rgba(29,158,117,0.12)] text-[#5DCAA5] border-[#1D9E75]/30"
                  : "bg-white/[0.04] text-[#9CA3AF] border-white/[0.08] hover:bg-white/[0.06] hover:text-white/80",
              )}
            >
              {c.icon ? <span aria-hidden="true">{c.icon}</span> : null}
              <span>{c.label}</span>
              <span
                className={cn(
                  "ml-1 text-[11px] tabular-nums",
                  active ? "text-[#5DCAA5]/80" : "text-white/40",
                )}
              >
                {c.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
