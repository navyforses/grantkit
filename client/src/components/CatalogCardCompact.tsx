/*
 * CatalogCardCompact — dense card for the split-view catalog list
 * (Phase 4B, Arash). ~92 px tall. Optimised for 600+ virtualized rows
 * alongside a Google Maps panel: no Framer Motion (too expensive at
 * scale), no bookmark button (that lives on the detail page), no
 * description (title + org + meta row only).
 *
 * Hover/highlight states are DOM-level so the row re-renders only when
 * `hovered` or `highlighted` flips — react-window keeps everything else
 * stable. Consumers (GrantList) pass the callbacks.
 */

import { memo, useCallback } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { MapPin } from "lucide-react";
import type { CatalogItem } from "@/lib/constants";
import { getCategoryBorderColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface CatalogCardCompactProps {
  item: CatalogItem;
  /** Highlighted = the map marker is being hovered. Visually stronger than local hover. */
  highlighted?: boolean;
  onHoverChange?: (id: string | null) => void;
  onClick?: (item: CatalogItem) => void;
}

function CatalogCardCompactImpl({
  item,
  highlighted = false,
  onHoverChange,
  onClick,
}: CatalogCardCompactProps) {
  const status = (item.status || "").toLowerCase();
  const isOpen = status === "open" || status === "";

  const handleClick = useCallback(
    (_e: MouseEvent<HTMLDivElement>) => {
      onClick?.(item);
    },
    [item, onClick],
  );

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.(item);
      }
    },
    [item, onClick],
  );

  const handleEnter = useCallback(() => onHoverChange?.(item.id), [item.id, onHoverChange]);
  const handleLeave = useCallback(() => onHoverChange?.(null), [onHoverChange]);

  const borderLeft = getCategoryBorderColor(item.category);
  const countryFlag = item.country === "US" ? "🇺🇸" : item.country === "GB" ? "🇬🇧" : "🌍";
  const location =
    item.state && item.state !== "Nationwide" && item.state !== "International"
      ? `${item.city ? item.city + ", " : ""}${item.state}`
      : item.country || "—";

  return (
    <div
      role="article"
      tabIndex={0}
      data-grant-id={item.id}
      data-highlighted={highlighted || undefined}
      aria-label={item.name}
      onClick={handleClick}
      onKeyDown={handleKey}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={cn(
        "group relative w-full rounded-lg cursor-pointer",
        "bg-[#12181D] border-l-4 px-3 py-2.5",
        "border border-white/[0.06] transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/60",
        "hover:bg-white/[0.02] hover:border-[#1D9E75]/30",
        highlighted &&
          "border-[#1D9E75]/60 bg-white/[0.03] shadow-[0_0_0_1px_rgba(29,158,117,0.35)]",
        borderLeft,
      )}
      style={{ height: 92 }}
    >
      {/* Status dot — top right */}
      <span
        className={cn(
          "absolute top-2.5 right-3 inline-flex items-center gap-1 text-[10px] font-medium tabular-nums",
          isOpen ? "text-[#5DCAA5]" : "text-white/40",
        )}
      >
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            isOpen ? "bg-[#1D9E75]" : "bg-white/30",
          )}
          aria-hidden="true"
        />
        {isOpen ? "Open" : item.status}
      </span>

      {/* Title */}
      <div className="pr-16">
        <h3 className="text-[13px] font-medium text-white/90 leading-tight line-clamp-1 group-hover:text-[#5DCAA5] transition-colors">
          {item.name}
        </h3>
        {item.organization && item.organization !== item.name && (
          <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1">
            {item.organization}
          </p>
        )}
      </div>

      {/* Meta row */}
      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/60">
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true">{countryFlag}</span>
          <MapPin className="w-3 h-3 text-white/30" aria-hidden="true" />
          <span className="truncate max-w-[140px]">{location}</span>
        </span>
        {item.amount && item.amount !== "Varies" && item.amount !== "" && (
          <span className="text-[#5DCAA5] font-medium truncate max-w-[160px]">
            {item.amount}
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(CatalogCardCompactImpl);
