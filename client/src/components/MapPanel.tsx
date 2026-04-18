/*
 * MapPanel — multi-grant clustered map for the split-view catalog (Phase 4B).
 *
 * Rendering strategy (Google Maps):
 *   - Each grant becomes an AdvancedMarkerElement with a tiny custom DOM content.
 *   - @googlemaps/markerclusterer groups them at low zoom. The default
 *     SuperClusterAlgorithm handles 500+ points comfortably.
 *   - Highlight is expressed by swapping the content class on one marker
 *     (bigger, bright outline) and raising its zIndex — no layer filters.
 *
 * Why DOM markers when Mapbox used native circle layers?
 *   Google Maps' AdvancedMarker is GPU-accelerated and the clusterer keeps
 *   the visible marker count small until the user zooms in. We measured this
 *   as acceptable for the catalog's 500–700 geocoded grants.
 *
 * Theme switching: Google's DARK/LIGHT colorScheme follows the Map option,
 * so we tear down + rebuild the Map on theme change. That's comparable to
 * the Mapbox style.swap approach and happens rarely enough to not matter.
 */

import { useEffect, useRef, useState } from "react";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  GOOGLE_MAP_ID,
  googleMapsReady,
  loadMapsAndMarker,
} from "@/lib/googleMapsLoader";

const TEAL = "#1D9E75";
const TEAL_BRIGHT = "#34D49C";

export interface MapPanelGrant {
  id: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  [k: string]: unknown;
}

interface MapPanelProps {
  grants: MapPanelGrant[];
  highlightedId?: string | null;
  onMarkerClick: (grant: MapPanelGrant) => void;
  onHover?: (grantId: string | null) => void;
  onMapReady?: (map: google.maps.Map) => void;
  className?: string;
}

const getIsDark = () => document.documentElement.classList.contains("dark");

export default function MapPanel({
  grants,
  highlightedId,
  onMarkerClick,
  onHover,
  onMapReady,
  className,
}: MapPanelProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(
    new Map(),
  );
  const markerLibRef = useRef<google.maps.MarkerLibrary | null>(null);
  const grantsRef = useRef<MapPanelGrant[]>(grants);
  grantsRef.current = grants;

  // Refs for callbacks so init effect never re-runs.
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Bumped when the map is torn down + rebuilt on theme change, to force
  // the grants/highlight effects to re-run against the new map.
  const [epoch, setEpoch] = useState(0);

  // ── Map init (re-runs on theme change via epoch) ──────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !googleMapsReady) {
      if (!googleMapsReady) setLoadError(true);
      return;
    }

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let initialDark = getIsDark();

    loadMapsAndMarker()
      .then(({ maps, marker }) => {
        if (disposed || !containerRef.current) return;

        const map = new maps.Map(containerRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          mapId: GOOGLE_MAP_ID,
          colorScheme: (initialDark
            ? "DARK"
            : "LIGHT") as google.maps.ColorScheme,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          zoomControl: true,
          zoomControlOptions: {
            // ControlPosition is a static enum on google.maps, not on the
            // MapsLibrary object returned by importLibrary.
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
        });
        mapRef.current = map;
        markerLibRef.current = marker;

        const clusterer = new MarkerClusterer({
          map,
          algorithm: new SuperClusterAlgorithm({
            radius: 80,
            maxZoom: 14,
          }),
          renderer: {
            render: ({ count, position }) => {
              const el = document.createElement("div");
              el.className = "mp-cluster";
              // Spec sizes: 1-10 → 20, 10-50 → 30, 50+ → 40.
              const size = count < 10 ? 40 : count < 50 ? 60 : 80;
              el.style.width = `${size}px`;
              el.style.height = `${size}px`;
              el.textContent = String(count);
              return new marker.AdvancedMarkerElement({
                position,
                content: el,
                zIndex: 1000 + count,
              });
            },
          },
        });
        clustererRef.current = clusterer;

        // Theme change: tear down + rebuild. Rare event (user toggles theme).
        themeObserver = new MutationObserver(() => {
          const nowDark = getIsDark();
          if (nowDark !== initialDark) {
            initialDark = nowDark;
            setEpoch((n) => n + 1);
          }
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });

        resizeObserver = new ResizeObserver(() => {
          google.maps.event.trigger(map, "resize");
        });
        resizeObserver.observe(container);

        setReady(true);
        // Expose the map instance to the parent (used by useGoogleMapFlyTo in Catalog).
        onMapReadyRef.current?.(map);
      })
      .catch((err) => {
        if (disposed) return;
        // eslint-disable-next-line no-console
        console.error("MapPanel: Google Maps load failed", err);
        setLoadError(true);
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
      // Array.from avoids the TS2802 iteration error without bumping the
      // target/downlevelIteration in tsconfig.
      for (const m of Array.from(markersRef.current.values())) {
        m.map = null;
      }
      markersRef.current.clear();
      markerLibRef.current = null;
      mapRef.current = null;
      setReady(false);
    };
  }, [epoch]);

  // ── Sync markers with the grants prop ─────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    const lib = markerLibRef.current;
    if (!map || !clusterer || !lib) return;

    const prev = markersRef.current;
    const next = new Map<string, google.maps.marker.AdvancedMarkerElement>();
    const toAdd: google.maps.marker.AdvancedMarkerElement[] = [];
    const toRemove: google.maps.marker.AdvancedMarkerElement[] = [];
    const keepIds = new Set<string>();

    for (const g of grants) {
      const lat = toCoord(g.latitude);
      const lng = toCoord(g.longitude);
      if (lat === null || lng === null) continue;

      keepIds.add(g.id);
      const existing = prev.get(g.id);
      if (existing) {
        existing.position = { lat, lng };
        next.set(g.id, existing);
      } else {
        const el = buildPinContent(g.id === highlightedId);
        const m = new lib.AdvancedMarkerElement({
          position: { lat, lng },
          content: el,
          gmpClickable: true,
        });
        attachHandlers(m, g.id);
        next.set(g.id, m);
        toAdd.push(m);
      }
    }

    for (const [id, m] of Array.from(prev.entries())) {
      if (!keepIds.has(id)) {
        m.map = null;
        toRemove.push(m);
      }
    }

    if (toRemove.length) clusterer.removeMarkers(toRemove as Marker[]);
    if (toAdd.length) clusterer.addMarkers(toAdd as Marker[]);

    markersRef.current = next;

    function attachHandlers(
      m: google.maps.marker.AdvancedMarkerElement,
      grantId: string,
    ) {
      m.addListener("gmp-click", () => {
        const g = grantsRef.current.find((gg) => gg.id === grantId);
        if (g) onMarkerClickRef.current(g);
      });
      const contentEl = m.content as HTMLElement | null;
      if (contentEl) {
        contentEl.addEventListener("mouseenter", () => {
          onHoverRef.current?.(grantId);
        });
        contentEl.addEventListener("mouseleave", () => {
          onHoverRef.current?.(null);
        });
      }
    }
    // highlightedId intentionally omitted — handled by its own effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grants, ready]);

  // ── Highlight: swap the content class of the matching marker ───────────
  useEffect(() => {
    if (!ready) return;
    for (const [id, m] of Array.from(markersRef.current.entries())) {
      const el = m.content as HTMLElement | null;
      if (!el) continue;
      const isHi = id === highlightedId;
      el.classList.toggle("mp-pin-highlight", isHi);
      m.zIndex = isHi ? 9999 : 1;
    }
  }, [highlightedId, ready]);

  // ── First-render fit to bounds (runs once markers land) ────────────────
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    let count = 0;
    for (const g of grants) {
      const lat = toCoord(g.latitude);
      const lng = toCoord(g.longitude);
      if (lat === null || lng === null) continue;
      bounds.extend({ lat, lng });
      count++;
    }
    if (count === 0) return;
    if (count === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(11);
      return;
    }
    map.fitBounds(bounds, 48);
    // Fit on first non-empty load only; later grant changes should not yank.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (loadError || !googleMapsReady) {
    return (
      <div
        className={cn(
          "w-full h-full rounded-xl bg-secondary text-muted-foreground text-xs flex items-center justify-center",
          className,
        )}
      >
        {t.map.error}
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-secondary", className)}>
      <style>{MAP_PANEL_CSS}</style>
      <div ref={containerRef} className="absolute inset-0" role="region" aria-label={t.map.loading} />
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function toCoord(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildPinContent(highlight: boolean): HTMLElement {
  const el = document.createElement("div");
  el.className = "mp-pin" + (highlight ? " mp-pin-highlight" : "");
  return el;
}

const MAP_PANEL_CSS = `
:root { --mp-teal: ${TEAL}; --mp-teal-bright: ${TEAL_BRIGHT}; }

.mp-pin {
  width: 14px;
  height: 14px;
  background: var(--mp-teal);
  border: 2px solid #ffffff;
  border-radius: 9999px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.3);
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform 120ms ease-out, background-color 120ms ease-out;
}
.mp-pin:hover {
  transform: translate(-50%, -50%) scale(1.2);
}
.mp-pin-highlight {
  width: 22px;
  height: 22px;
  background: var(--mp-teal-bright);
  border-width: 3px;
  box-shadow: 0 0 0 2px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5);
  transform: translate(-50%, -50%) scale(1);
  animation: mp-pin-beat 1.5s ease-in-out infinite;
}
/* Phase 4B — pulsing ring on the highlighted marker. Two rings rendered
   via ::before and ::after so the pulse appears continuous. */
.mp-pin-highlight::before,
.mp-pin-highlight::after {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 9999px;
  border: 2px solid var(--mp-teal-bright);
  pointer-events: none;
  opacity: 0;
  animation: mp-pin-ring 1.5s ease-out infinite;
}
.mp-pin-highlight::after {
  animation-delay: 0.75s;
}
@keyframes mp-pin-beat {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50%      { transform: translate(-50%, -50%) scale(1.12); }
}
@keyframes mp-pin-ring {
  0%   { transform: scale(0.85); opacity: 0.85; }
  100% { transform: scale(2.2);  opacity: 0;    }
}

.mp-cluster {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--mp-teal);
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.9;
  cursor: pointer;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.mp-cluster:hover { opacity: 1; }

.gm-style * { outline: none; }
`;
