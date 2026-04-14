/**
 * MapSortSelect — Sort dropdown for the Supabase resource view.
 * Available options vary by resource type and whether a search query is active.
 */
import { useLanguage } from "@/contexts/LanguageContext";
import type { ResourceType } from "@/types/resources";

interface MapSortSelectProps {
  resourceType: ResourceType | undefined;
  value: string;
  onChange: (sort: string) => void;
  hasSearch?: boolean;
}

interface SortOption {
  value: string;
  label: string;
}

export default function MapSortSelect({ resourceType, value, onChange, hasSearch = false }: MapSortSelectProps) {
  const { t } = useLanguage();

  const allOptions: Record<string, SortOption> = {
    newest:      { value: "newest",      label: t.resources.sortNewest },
    deadline:    { value: "deadline",    label: t.resources.sortDeadline },
    amount_desc: { value: "amount_desc", label: t.resources.sortAmountHigh },
    amount_asc:  { value: "amount_asc",  label: t.resources.sortAmountLow },
    name_asc:    { value: "name_asc",    label: t.resources.sortName },
    relevance:   { value: "relevance",   label: t.resources.sortRelevance },
  };

  // Options by resource type
  const optionKeys: Record<string, string[]> = {
    GRANT:   ["newest", "deadline", "amount_desc", "amount_asc", "name_asc"],
    SOCIAL:  ["newest", "name_asc"],
    MEDICAL: ["newest", "deadline", "name_asc"],
  };

  const keys = optionKeys[resourceType ?? "GRANT"] ?? optionKeys["GRANT"];

  // Add relevance option only when a search query is active
  const displayKeys = hasSearch ? [...keys, "relevance"] : keys;
  const options = displayKeys.map((k) => allOptions[k]).filter(Boolean);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
