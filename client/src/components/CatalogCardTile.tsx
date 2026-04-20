/*
 * CatalogCardTile — compact rich card used in the list grid, the split
 * view's sidebar list, and the mobile list tab.
 *
 * Density target: ~200 px tall. Fits title, organisation, category + type +
 * funding tags, a 2-line description, and the location / phone / website
 * meta row without needing the user to open the detail page. Clicking the
 * card routes to /grant/{id} for full info.
 */

import { memo, useCallback } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Globe, Home, MapPin, Phone } from "lucide-react";
import type { CatalogItem } from "@/lib/constants";
import { getCategoryStyle } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const CATEGORY_ACCENT: Record<string, string> = {
  medical_treatment:    "bg-[color:var(--color-accent-terracotta)]",
  financial_assistance: "bg-[color:var(--brand-green)]",
  assistive_technology: "bg-[color:var(--color-accent-peach)]",
  social_services:      "bg-[color:var(--brand-soft)]",
  scholarships:         "bg-[color:var(--color-accent-honey)]",
  housing:              "bg-[color:var(--color-accent-peach)]",
  travel_transport:     "bg-[color:var(--brand-soft)]",
  international:        "bg-[color:var(--color-accent-sand)]",
  food_basic_needs:     "bg-[color:var(--color-accent-honey)]",
  startup:              "bg-[color:var(--color-accent-peach)]",
  business_funding:     "bg-[color:var(--color-accent-sand)]",
  educational:          "bg-[color:var(--brand-soft)]",
  research:             "bg-[color:var(--brand-green)]",
  community:            "bg-[color:var(--color-accent-honey)]",
  individual:           "bg-[color:var(--color-accent-peach)]",
  other:                "bg-[color:var(--color-accent-sand)]",
};

function accentFor(category: string): string {
  return CATEGORY_ACCENT[category] ?? CATEGORY_ACCENT.other;
}

export interface CatalogCardTileProps {
  item: CatalogItem;
  /** When true, renders a brighter border — used by SplitView to mirror the
   *  map's hovered marker. Defaults to false. */
  highlighted?: boolean;
  onHoverChange?: (id: string | null) => void;
  onClick?: (item: CatalogItem) => void;
  className?: string;
}

function CatalogCardTileImpl({
  item,
  highlighted = false,
  onHoverChange,
  onClick,
  className,
}: CatalogCardTileProps) {
  const { t, tCategory, tCountry, tCatalogContent } = useLanguage();

  const content = tCatalogContent(item.id, {
    name: item.name,
    description: item.description,
    eligibility: item.eligibility || "",
  });

  const categoryLabel = tCategory(item.category);
  const accent = accentFor(item.category);
  const typeLabel = item.type === "grant" ? t.catalog.typeGrant : t.catalog.typeResource;

  const fundingLabel = (() => {
    const raw = (item.fundingType || "").trim();
    if (!raw || raw.toLowerCase() === "all") return null;
    return raw.replace(/_/g, " ");
  })();

  const diagnosisLabel = (() => {
    const raw = (item.targetDiagnosis || "").trim();
    if (!raw) return null;
    if (raw.toLowerCase() === "general" || raw.toLowerCase() === "all") return null;
    return raw;
  })();

  const ageLabel = (() => {
    const raw = (item.ageRange || "").trim();
    if (!raw || raw.toLowerCase() === "all ages" || raw.toLowerCase() === "all") return null;
    return raw;
  })();

  const tags: { label: string; icon?: string; tone: "category" | "neutral" | "accent" }[] = [];
  tags.push({ label: categoryLabel, tone: "category" });
  tags.push({ label: typeLabel, tone: "neutral" });
  if (fundingLabel) tags.push({ label: fundingLabel, icon: "💠", tone: "neutral" });
  if (diagnosisLabel) tags.push({ label: diagnosisLabel, icon: "🩺", tone: "neutral" });
  if (ageLabel) tags.push({ label: ageLabel, icon: "👤", tone: "neutral" });
  if (item.b2VisaEligible === "yes") tags.push({ label: t.grantDetail.b2VisaOK, icon: "✈️", tone: "accent" });

  const location = (() => {
    const parts: string[] = [];
    if (item.city) parts.push(item.city);
    if (item.state && item.state !== "Nationwide" && item.state !== "International") {
      parts.push(item.state);
    }
    if (parts.length === 0) return tCountry(item.country) || item.country || "—";
    return parts.join(", ");
  })();

  const website = (item.website || "").trim();
  const websiteHref = website ? (website.startsWith("http") ? website : `https://${website}`) : "";
  const websiteLabel = website
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const handleClick = useCallback(
    (_e: MouseEvent<HTMLDivElement>) => onClick?.(item),
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

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      role="article"
      tabIndex={0}
      data-grant-id={item.id}
      data-highlighted={highlighted || undefined}
      aria-label={content.name}
      onClick={handleClick}
      onKeyDown={handleKey}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl cursor-pointer",
        "bg-[#12181D] border border-white/[0.06]",
        "transition-all duration-150 hover:border-[#1D9E75]/40 hover:shadow-lg hover:shadow-black/20",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/60",
        highlighted && "border-[#1D9E75]/60 shadow-[0_0_0_1px_rgba(29,158,117,0.45)]",
        className,
      )}
    >
      {/* Top accent bar */}
      <div className={cn("h-1 w-full shrink-0", accent)} aria-hidden="true" />

      <div className="flex flex-1 flex-col gap-2 p-3 min-h-0">
        {/* Header: icon + title + organisation */}
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-full",
              "h-8 w-8 bg-white/[0.04] border border-white/[0.06]",
            )}
            aria-hidden="true"
          >
            <Home className="h-4 w-4 text-white/70" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold leading-tight text-white/90 line-clamp-1 group-hover:text-[#5DCAA5] transition-colors">
              {content.name}
            </h3>
            {item.organization && item.organization !== content.name && (
              <p className="text-[11px] text-white/50 line-clamp-1">
                {item.organization}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 overflow-hidden max-h-[24px]">
          {tags.map((tag, i) => (
            <span
              key={`${tag.label}-${i}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium border whitespace-nowrap",
                tag.tone === "category" && getCategoryStyle(item.category),
                tag.tone === "neutral" && "bg-white/[0.04] text-white/70 border-white/[0.08]",
                tag.tone === "accent"   && "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
              )}
            >
              {tag.icon && <span aria-hidden="true">{tag.icon}</span>}
              <span className="truncate max-w-[140px]">{tag.label}</span>
            </span>
          ))}
        </div>

        {/* Description */}
        {content.description && (
          <p className="text-[12.5px] leading-snug text-white/60 line-clamp-2">
            {content.description}
          </p>
        )}

        {/* Meta — single inline row, wraps if needed */}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-white/60">
          <span className="inline-flex items-center gap-1 min-w-0">
            <MapPin className="h-3 w-3 shrink-0 text-white/30" aria-hidden="true" />
            <span className="truncate max-w-[140px]">{location}</span>
          </span>
          {item.phone && (
            <a
              href={`tel:${item.phone}`}
              onClick={stop}
              className="inline-flex items-center gap-1 min-w-0 hover:text-white/90 transition-colors"
            >
              <Phone className="h-3 w-3 shrink-0 text-white/30" aria-hidden="true" />
              <span className="truncate max-w-[120px]">{item.phone}</span>
            </a>
          )}
          {websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              className="inline-flex items-center gap-1 min-w-0 text-[#5DCAA5] hover:text-[#1D9E75] transition-colors"
            >
              <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[140px]">{websiteLabel}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CatalogCardTileImpl);
