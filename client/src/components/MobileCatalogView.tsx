/*
 * MobileCatalogView — tab-switched list / map for phones (Phase 4B, Arash).
 *
 * Split-view doesn't work below 768 px (neither side has room). Instead
 * we expose a two-tab switcher: List (virtualised cards) and Map. Hover
 * sync is disabled on touch devices — it would fire on every tap — so
 * this view just forwards clicks/marker-taps up to the parent for
 * navigation.
 */

import { useState } from "react";
import { List as ListIcon, Map as MapIcon } from "lucide-react";
import GrantList from "@/components/GrantList";
import MapPanel, { type MapPanelGrant } from "@/components/MapPanel";
import type { CatalogItem } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export type MobileCatalogTab = "list" | "map";

export interface MobileCatalogViewProps {
  grants: CatalogItem[];
  tab?: MobileCatalogTab;
  onTabChange?: (tab: MobileCatalogTab) => void;
  onCardClick: (item: CatalogItem) => void;
  onMarkerClick: (item: CatalogItem) => void;
  onMapReady?: (map: google.maps.Map) => void;
  className?: string;
}

export default function MobileCatalogView({
  grants,
  tab: controlledTab,
  onTabChange,
  onCardClick,
  onMarkerClick,
  onMapReady,
  className,
}: MobileCatalogViewProps) {
  const { t } = useLanguage();
  const [internalTab, setInternalTab] = useState<MobileCatalogTab>("list");
  const tab = controlledTab ?? internalTab;
  const setTab = (next: MobileCatalogTab) => {
    if (controlledTab === undefined) setInternalTab(next);
    onTabChange?.(next);
  };

  return (
    <div className={cn("flex flex-col h-full w-full bg-[#0F1419]", className)}>
      <div
        role="tablist"
        aria-label={t.mobileCatalog.ariaLabel}
        className="flex border-b border-white/[0.06] shrink-0"
      >
        <TabButton
          active={tab === "list"}
          onClick={() => setTab("list")}
          icon={<ListIcon className="w-4 h-4" aria-hidden="true" />}
          label={t.mobileCatalog.list.replace("{count}", String(grants.length))}
        />
        <TabButton
          active={tab === "map"}
          onClick={() => setTab("map")}
          icon={<MapIcon className="w-4 h-4" aria-hidden="true" />}
          label={t.mobileCatalog.map}
        />
      </div>
      <div className="relative flex-1 min-h-0">
        {tab === "list" ? (
          <GrantList grants={grants} onCardClick={onCardClick} />
        ) : (
          <MapPanel
            className="absolute inset-0 w-full h-full"
            grants={grants as unknown as MapPanelGrant[]}
            onMarkerClick={(g) => {
              const match = grants.find((it) => it.id === g.id);
              if (match) onMarkerClick(match);
            }}
            onMapReady={onMapReady}
          />
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex-1 h-11 inline-flex items-center justify-center gap-1.5",
        "text-[13px] font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1D9E75]/60",
        active
          ? "text-[#5DCAA5] border-b-2 border-[#1D9E75]"
          : "text-white/60 border-b-2 border-transparent hover:text-white/80",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
