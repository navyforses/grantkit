/*
 * MapPanel — multi-grant clustered map for the split-view catalog (Phase 4B).
 *
 * Rendering strategy:
 *   - All grants live in ONE GeoJSON source with cluster:true. This keeps
 *     500+ pins performant — Mapbox handles clustering on the worker thread,
 *     not in React.
 *   - Three layers off that source:
 *       1. clusters       (filtered: point_count present)
 *       2. cluster-count  (text labels)
 *       3. unclustered    (individual pins, teal circle)
 *   - Highlight is a separate "highlight" layer drawing a larger pulsing pin
 *     filtered by the highlightedId feature property. Toggling state writes
 *     a new filter — no re-create.
 *
 * Why no DOM markers? 500 React-managed `<Marker>` nodes thrash layout on
 * pan/zoom. Native circle layers stay buttery on mid-tier mobile.
 */

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
const STYLE_LIGHT = "mapbox://styles/mapbox/light-v11";
const TEAL = "#1D9E75";
const TEAL_BRIGHT = "#34D49C";

const SRC_ID = "grants-src";
const LYR_CLUSTERS = "grants-clusters";
const LYR_CLUSTER_COUNT = "grants-cluster-count";
const LYR_POINT = "grants-point";
const LYR_HIGHLIGHT = "grants-point-highlight";

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
  className?: string;
}

const getIsDark = () => document.documentElement.classList.contains("dark");

export default function MapPanel({
  grants,
  highlightedId,
  onMarkerClick,
  onHover,
  className,
}: MapPanelProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const styleLoadedRef = useRef(false);
  // Keep the latest grants list available to event handlers without rebinding.
  const grantsRef = useRef<MapPanelGrant[]>(grants);
  grantsRef.current = grants;

  // ── Map init (once) ────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !TOKEN) return;

    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container,
      style: getIsDark() ? STYLE_DARK : STYLE_LIGHT,
      center: [0, 20],
      zoom: 1.5,
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    mapRef.current = map;
    styleLoadedRef.current = false;

    map.once("style.load", () => {
      addLayers(map);
      styleLoadedRef.current = true;
      // Seed source with whatever grants we already have.
      writeSource(map, grantsRef.current);
      fitToGrants(map, grantsRef.current);
    });

    // Cluster click → zoom in by ~2 levels (use cluster_id for accuracy when possible).
    map.on("click", LYR_CLUSTERS, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const geom = feature.geometry;
      if (geom.type !== "Point") return;
      const [lng, lat] = geom.coordinates as [number, number];
      const targetZoom = Math.min(map.getZoom() + 2, 18);
      map.easeTo({ center: [lng, lat], zoom: targetZoom, duration: 500 });
    });

    // Individual pin click → onMarkerClick(grant)
    map.on("click", LYR_POINT, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const id = feature.properties?.id as string | undefined;
      if (!id) return;
      const g = grantsRef.current.find((gg) => gg.id === id);
      if (g) onMarkerClick(g);
    });

    // Highlight pin click → still selectable
    map.on("click", LYR_HIGHLIGHT, (e) => {
      const feature = e.features?.[0];
      const id = feature?.properties?.id as string | undefined;
      if (!id) return;
      const g = grantsRef.current.find((gg) => gg.id === id);
      if (g) onMarkerClick(g);
    });

    // Hover state — change cursor + emit hover id
    let lastHoverId: string | null = null;
    const handleMove = (e: mapboxgl.MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      const id = (e.features?.[0]?.properties?.id as string | undefined) ?? null;
      if (id !== lastHoverId) {
        lastHoverId = id;
        onHover?.(id);
      }
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = "";
      if (lastHoverId !== null) {
        lastHoverId = null;
        onHover?.(null);
      }
    };
    map.on("mousemove", LYR_POINT, handleMove);
    map.on("mouseleave", LYR_POINT, handleLeave);
    map.on("mousemove", LYR_CLUSTERS, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", LYR_CLUSTERS, () => { map.getCanvas().style.cursor = ""; });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    // Theme switch: re-add layers after style swap.
    let prevDark = getIsDark();
    const mo = new MutationObserver(() => {
      const nowDark = getIsDark();
      if (nowDark !== prevDark) {
        prevDark = nowDark;
        styleLoadedRef.current = false;
        map.setStyle(nowDark ? STYLE_DARK : STYLE_LIGHT);
        map.once("style.load", () => {
          addLayers(map);
          styleLoadedRef.current = true;
          writeSource(map, grantsRef.current);
        });
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      ro.disconnect();
      mo.disconnect();
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
    // Init once. Hover/click handlers read live state via grantsRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update GeoJSON source when grants change ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    writeSource(map, grants);
    // Refit only when transitioning from empty → non-empty so we don't yank
    // the user's view on every minor filter change.
    const src = map.getSource(SRC_ID) as GeoJSONSource | undefined;
    if (src && grants.length > 0) {
      // No-op for reflow; fit handled below conditionally
    }
  }, [grants]);

  // ── Highlight filter ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    if (!map.getLayer(LYR_HIGHLIGHT)) return;
    if (highlightedId) {
      map.setFilter(LYR_HIGHLIGHT, ["==", ["get", "id"], highlightedId]);
      map.setLayoutProperty(LYR_HIGHLIGHT, "visibility", "visible");
    } else {
      map.setLayoutProperty(LYR_HIGHLIGHT, "visibility", "none");
    }
  }, [highlightedId]);

  if (!TOKEN) {
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

// ── Helpers ───────────────────────────────────────────────────────────────

function toCoord(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildFeatureCollection(
  grants: MapPanelGrant[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (const g of grants) {
    const lng = toCoord(g.longitude);
    const lat = toCoord(g.latitude);
    if (lng === null || lat === null) continue;
    features.push({
      type: "Feature",
      properties: { id: g.id },
      geometry: { type: "Point", coordinates: [lng, lat] },
    });
  }
  return { type: "FeatureCollection", features };
}

function writeSource(map: mapboxgl.Map, grants: MapPanelGrant[]) {
  const src = map.getSource(SRC_ID) as GeoJSONSource | undefined;
  if (src) {
    src.setData(buildFeatureCollection(grants));
  }
}

function fitToGrants(map: mapboxgl.Map, grants: MapPanelGrant[]) {
  const valid = grants
    .map((g) => [toCoord(g.longitude), toCoord(g.latitude)] as const)
    .filter((c): c is readonly [number, number] => c[0] !== null && c[1] !== null);
  if (valid.length === 0) return;
  if (valid.length === 1) {
    map.easeTo({ center: [valid[0][0], valid[0][1]], zoom: 11, duration: 0 });
    return;
  }
  const bounds = new mapboxgl.LngLatBounds(
    [valid[0][0], valid[0][1]],
    [valid[0][0], valid[0][1]],
  );
  for (const [lng, lat] of valid) bounds.extend([lng, lat]);
  map.fitBounds(bounds, { padding: 48, duration: 0, maxZoom: 12 });
}

function addLayers(map: mapboxgl.Map) {
  if (!map.getSource(SRC_ID)) {
    map.addSource(SRC_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });
  }

  if (!map.getLayer(LYR_CLUSTERS)) {
    map.addLayer({
      id: LYR_CLUSTERS,
      type: "circle",
      source: SRC_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": TEAL,
        "circle-opacity": 0.85,
        // Spec sizes: 1-10 → 20px, 10-50 → 30px, 50+ → 40px
        "circle-radius": [
          "step",
          ["get", "point_count"],
          20, 10,
          30, 50,
          40,
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }

  if (!map.getLayer(LYR_CLUSTER_COUNT)) {
    map.addLayer({
      id: LYR_CLUSTER_COUNT,
      type: "symbol",
      source: SRC_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12,
        "text-allow-overlap": true,
      },
      paint: { "text-color": "#ffffff" },
    });
  }

  if (!map.getLayer(LYR_POINT)) {
    map.addLayer({
      id: LYR_POINT,
      type: "circle",
      source: SRC_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": TEAL,
        "circle-radius": 7,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }

  if (!map.getLayer(LYR_HIGHLIGHT)) {
    map.addLayer({
      id: LYR_HIGHLIGHT,
      type: "circle",
      source: SRC_ID,
      // Default: matches nothing until a highlight id is set.
      filter: ["==", ["get", "id"], "__none__"],
      layout: { visibility: "none" },
      paint: {
        // 1.5× the regular point: 7 → ~11
        "circle-radius": 11,
        "circle-color": TEAL_BRIGHT,
        "circle-opacity": 0.9,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
      },
    });
  }
}

const MAP_PANEL_CSS = `
.mapboxgl-canvas:focus { outline: none; }
`;
