/**
 * ResourceList — Paginated admin table for Supabase resources.
 * Provides search, type/status filter, and edit/delete actions.
 */
import { useState, useCallback } from "react";
import { Search, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useResources } from "@/hooks/useResources";
import StatusBadge from "@/components/StatusBadge";
import type { ResourceFull, ResourceType, ResourceStatus } from "@/types/resources";

const TYPE_COLORS: Record<ResourceType, string> = {
  GRANT:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  SOCIAL:  "bg-blue-50 text-blue-700 border-blue-200",
  MEDICAL: "bg-purple-50 text-purple-700 border-purple-200",
};

interface ResourceListProps {
  onEdit: (resource: ResourceFull) => void;
  onDelete: (resource: ResourceFull) => void;
  refreshKey?: number;
}

const PAGE_SIZE = 25;

export default function ResourceList({ onEdit, onDelete, refreshKey }: ResourceListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | undefined>(undefined);

  const {
    data: resources,
    loading,
    totalCount,
    filters,
    dispatch,
  } = useResources(typeFilter);

  // Wire search into the hook's debounced search
  const handleSearch = useCallback(
    (q: string) => {
      setSearch(q);
      dispatch({ type: "SET_SEARCH", payload: q });
    },
    [dispatch],
  );

  const handleTypeChange = (t: ResourceType | undefined) => {
    setTypeFilter(t);
    dispatch({ type: "SET_TYPE", payload: t });
    dispatch({ type: "SET_PAGE", payload: 1 });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && resources.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search by title or source…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64 bg-background"
          />
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={typeFilter ?? ""}
            onChange={(e) => handleTypeChange((e.target.value as ResourceType) || undefined)}
            className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
          >
            <option value="">All Types</option>
            <option value="GRANT">Grants</option>
            <option value="SOCIAL">Social Aid</option>
            <option value="MEDICAL">Medical</option>
          </select>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {totalCount} resources
          </span>
        </div>
      </div>

      {/* Table */}
      {resources.length === 0 ? (
        <div className="py-12 text-center bg-card rounded-xl border border-border">
          <p className="text-muted-foreground text-sm">No resources found.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Categories</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Country</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Deadline</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resources.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3 max-w-xs">
                      <p className="font-medium text-foreground truncate">{r.title}</p>
                      {r.source_name && (
                        <p className="text-xs text-muted-foreground truncate">{r.source_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TYPE_COLORS[r.resource_type]}`}>
                        {r.resource_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {r.categories?.slice(0, 2).map((c) => (
                          <span key={c.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-secondary rounded-full text-muted-foreground">
                            {c.icon && <span>{c.icon}</span>}
                            <span className="truncate max-w-[80px]">{c.name}</span>
                          </span>
                        ))}
                        {(r.categories?.length ?? 0) > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{r.categories!.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {r.locations?.map((l) => l.country_code).join(", ") ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {r.deadline ? new Date(r.deadline).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => onEdit(r)}
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(r)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Page {filters.page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={filters.page <= 1}
                  onClick={() => dispatch({ type: "SET_PAGE", payload: filters.page - 1 })}
                  className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={filters.page >= totalPages}
                  onClick={() => dispatch({ type: "SET_PAGE", payload: filters.page + 1 })}
                  className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
