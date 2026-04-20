/*
 * CatalogSidebar — vertical filter rail for the List view.
 *
 * Shows category filter as an icon + count list (the catalog toolbar
 * used to have a dropdown for this; we moved it here per the 2026-04-20
 * redesign so the top bar only carries location filters). A chip group
 * for "type" (grant / resource) sits below the category list.
 *
 * Used only in `layoutMode === "list"` — split view / map view keep
 * their existing MapFilterPanel overlay.
 */

import type { CategoryValue, TypeValue } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface CategoryOption {
  id: string;
  label: string;
  count: number;
  icon?: string;
}

export interface CatalogSidebarProps {
  categoryFilter: CategoryValue;
  onCategoryChange: (v: CategoryValue) => void;
  typeFilter: TypeValue;
  onTypeChange: (v: TypeValue) => void;
  availableCategories: CategoryOption[];
  totalCount: number;
  className?: string;
}

export default function CatalogSidebar({
  categoryFilter,
  onCategoryChange,
  typeFilter,
  onTypeChange,
  availableCategories,
  totalCount,
  className,
}: CatalogSidebarProps) {
  const { t } = useLanguage();

  const categoryItems: CategoryOption[] = [
    { id: "all", label: t.toolbar.category.all, count: totalCount, icon: "📋" },
    ...availableCategories,
  ];

  const typeOptions: { value: TypeValue; label: string }[] = [
    { value: "all",      label: t.catalog.typeAll },
    { value: "grant",    label: t.catalog.typeGrant },
    { value: "resource", label: t.catalog.typeResource },
  ];

  return (
    <aside
      aria-label={t.toolbar.category.label}
      className={cn(
        "w-[240px] shrink-0 h-full overflow-y-auto border-r border-border bg-background",
        "scrollbar-thin",
        className,
      )}
    >
      <div className="flex flex-col gap-6 p-4">
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t.toolbar.category.label}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {categoryItems.map((c) => {
              const isActive = c.id === "all" ? categoryFilter === "all" : categoryFilter === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onCategoryChange(c.id as CategoryValue)}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/60",
                      isActive
                        ? "bg-[color:var(--brand-green)]/15 text-[color:var(--brand-green)] font-medium"
                        : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {c.icon && (
                      <span className="w-4 text-center" aria-hidden="true">
                        {c.icon}
                      </span>
                    )}
                    <span className="flex-1 truncate">{c.label}</span>
                    <span
                      className={cn(
                        "text-[11px] tabular-nums",
                        isActive ? "text-[color:var(--brand-green)]" : "text-muted-foreground/70",
                      )}
                    >
                      {c.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t.filters.type}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {typeOptions.map((opt) => {
              const isActive = typeFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onTypeChange(opt.value)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-[12px] transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]/60",
                    isActive
                      ? "bg-[color:var(--brand-green)]/15 text-[color:var(--brand-green)] border-[var(--brand-green)]/30 font-medium"
                      : "bg-transparent text-foreground/80 border-border hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
