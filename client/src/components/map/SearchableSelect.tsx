/*
 * SearchableSelect — compact dropdown with live-search filtering.
 * Designed for the map filter panel: opens as an absolute-positioned layer
 * directly below the trigger (no portals, no Radix dependency).
 *
 * Keyboard support:
 *   ArrowDown / ArrowUp  — move focus through options
 *   Enter                — select focused option
 *   Escape               — close dropdown (propagation stopped)
 *   Home / End           — jump to first / last option
 *
 * Usage:
 *   <SearchableSelect
 *     options={[{ value: "US", label: "United States", secondary: "🇺🇸" }]}
 *     value="US"
 *     onChange={(v) => setCountry(v)}
 *   />
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional leading decorator — flag emoji, icon, etc. */
  secondary?: string;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Max items rendered in list (default 120). User must type to see more. */
  maxVisible?: number;
  className?: string;
  /** Translated "No results" text */
  noResultsLabel?: string;
  /** Translated "Type to narrow results ({count} more…)" template. Use {count} placeholder. */
  typeMoreLabel?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled = false,
  maxVisible = 120,
  className = "",
  noResultsLabel = "No results",
  typeMoreLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const visibleOptions = filtered.slice(0, maxVisible);
  const selected = options.find((o) => o.value === value);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-focus search on open; clear state on close
  useEffect(() => {
    if (open) {
      setActiveIndex(-1);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      setSearch("");
      setActiveIndex(-1);
    }
  }, [open]);

  // Reset active index when search changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    const total = visibleOptions.length;
    if (total === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % total);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? total - 1 : i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(total - 1);
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < total) {
          onChange(visibleOptions[activeIndex].value);
          setOpen(false);
        }
        break;
    }
  };

  const listboxId = useRef(`ss-listbox-${Math.random().toString(36).slice(2)}`).current;
  const getOptionId = (i: number) => `${listboxId}-opt-${i}`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Trigger button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className={[
          "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border",
          "transition-colors duration-150",
          disabled
            ? "opacity-40 cursor-not-allowed bg-secondary border-border text-muted-foreground"
            : "bg-background/60 border-border hover:border-primary/40 hover:bg-secondary cursor-pointer text-foreground",
        ].join(" ")}
      >
        {selected?.secondary && (
          <span className="text-base leading-none flex-shrink-0">
            {selected.secondary}
          </span>
        )}
        <span className={`flex-1 text-left truncate ${!selected ? "text-muted-foreground" : ""}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className={[
            "absolute left-0 right-0 z-50 mt-1",
            "bg-popover border border-border rounded-lg shadow-xl",
            "overflow-hidden",
          ].join(" ")}
          style={{ top: "100%" }}
        >
          {/* Search bar */}
          <div className="p-2 border-b border-border">
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-activedescendant={activeIndex >= 0 ? getOptionId(activeIndex) : undefined}
                className="flex-1 min-w-0 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </label>
          </div>

          {/* Options list */}
          <div ref={listRef} id={listboxId} role="listbox" className="overflow-y-auto" style={{ maxHeight: "11rem" }}>
            {visibleOptions.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground text-center">
                {noResultsLabel}
              </p>
            ) : (
              <>
                {visibleOptions.map((opt, i) => (
                  <button
                    key={opt.value}
                    ref={(el) => { optionRefs.current[i] = el; }}
                    id={getOptionId(i)}
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={[
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                      "transition-colors duration-100",
                      activeIndex === i
                        ? "bg-accent text-accent-foreground"
                        : opt.value === value
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")}
                  >
                    {opt.secondary && (
                      <span className="text-base leading-none flex-shrink-0">
                        {opt.secondary}
                      </span>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
                {filtered.length > maxVisible && (
                  <p className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border">
                    {typeMoreLabel
                      ? typeMoreLabel.replace("{count}", String(filtered.length - maxVisible))
                      : `Type to narrow results (${filtered.length - maxVisible} more\u2026)`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
