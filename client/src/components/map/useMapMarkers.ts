/*
 * useMapMarkers — clustered GeoJSON grant/resource markers on the Mapbox map.
 *
 * Behaviour:
 *   • Items are clustered at low zoom levels; expands on click.
 *   • Clicking an individual marker calls onSelectItem(id) → Phase 5 side panel.
 *   • Hovering an individual marker shows a name/org tooltip.
 *   • Survives dark ↔ light style reloads (re-adds source + layers on style.load).
 *   • Source data is updated reactively whenever `items` changes (filter changes).
 *
 * Visual palette: indigo (matches app primary colour):
 *   small clusters #818cf8 · medium #6366f1 · large #4f46e5
 */

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { CatalogItem } from "@/lib/constants";
import { resolveItemCoords } from "./resolveCoords";

// ── Layer / source IDs ────────────────────────────────────────────────────────

const SRC         = "grants";
const LYR_CLUSTER = "grants-clusters";
const LYR_COUNT   = "grants-cluster-count";
const LYR_POINTS  = "grants-points";

// ── Colour palette ────────────────────────────────────────────────────────────

const C_SM = "#818cf8"; // < 10 items in cluster
const C_MD = "#6366f1"; // 10 – 49
const C_LG = "#4f46e5"; // 50+

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape HTML special characters to prevent XSS in setHTML() calls. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── GeoJSON builder ───────────────────────────────────────────────────────────

function toGeoJSON(items: CatalogItem[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (const item of items) {
    const c = resolveItemCoords(item.country, item.state, item.city);
    if (!c) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: c },
      properties: {
        id:           item.id,
        name:         item.name,
        organization: item.organization ?? "",
        itemType:     item.type,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

// ── Source + layer setup ──────────────────────────────────────────────────────

function addSourceAndLayers(
  map: mapboxgl.Map,
  data: GeoJSON.FeatureCollection<GeoJSON.Point>,
) {
  if (map.getSource(SRC)) return; // guard: called again after style reload

  map.addSource(SRC, {
    type: "geojson",
    data,
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 48,
  });

  // ── Cluster circles ───────────────────────────────────────────────────────
  map.addLayer({
    id: LYR_CLUSTER,
    type: "circle",
    source: SRC,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": ["step", ["get", "point_count"], C_SM, 10, C_MD, 50, C_LG],
      "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 50, 30],
      "circle-opacity": 0.88,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-opacity": 0.35,
    },
  });

  // ── Cluster count labels ──────────────────────────────────────────────────
  map.addLayer({
    id: LYR_COUNT,
    type: "symbol",
    source: SRC,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
    paint: { "text-color": "#ffffff" },
  });

  // ── Individual points ─────────────────────────────────────────────────────
  map.addLayer({
    id: LYR_POINTS,
    type: "circle",
    source: SRC,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": C_SM,
      "circle-radius": 7,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-opacity": 0.8,
      "circle-opacity": 0.9,
    },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type LayerHandler = (e: mapboxgl.MapLayerMouseEvent) => void;

interface HandlerSet {
  clusterClick: LayerHandler;
  pointClick:   LayerHandler;
  pointEnter:   LayerHandler;
  pointLeave:   LayerHandler;
  clusterEnter: LayerHandler;
  clusterLeave: LayerHandler;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMapMarkers(
  map: mapboxgl.Map | null,
  items: CatalogItem[],
  onSelectItem: (id: string) => void,
) {
  // Refs keep callbacks/data fresh inside stable event handler closures
  const itemsRef    = useRef<CatalogItem[]>(items);
  const onSelectRef = useRef(onSelectItem);
  const popupRef    = useRef<mapboxgl.Popup | null>(null);
  // Stored handler references so we can remove them before re-registering
  // after a style.load (dark ↔ light toggle), preventing duplicate firings.
  const handlersRef = useRef<HandlerSet | null>(null);
  // GeoJSON cache — avoids re-converting the same items array reference
  const geoJsonCacheRef = useRef<{ items: CatalogItem[]; data: GeoJSON.FeatureCollection<GeoJSON.Point> } | null>(null);

  itemsRef.current    = items;
  onSelectRef.current = onSelectItem;

  // ── Layer setup — runs once per map instance, re-runs on style.load ────────
  useEffect(() => {
    if (!map) return;

    const setup = () => {
      // 1. Remove any lingering popup from before the style reload
      popupRef.current?.remove();
      popupRef.current = null;

      // 2. Remove old event handlers (if any) before re-adding them.
      //    Without this, each style.load call would pile up a new set of
      //    handlers on the same layers, causing N-fold event firing.
      if (handlersRef.current) {
        const h = handlersRef.current;
        map.off("click",      LYR_CLUSTER, h.clusterClick);
        map.off("click",      LYR_POINTS,  h.pointClick);
        map.off("mouseenter", LYR_POINTS,  h.pointEnter);
        map.off("mouseleave", LYR_POINTS,  h.pointLeave);
        map.off("mouseenter", LYR_CLUSTER, h.clusterEnter);
        map.off("mouseleave", LYR_CLUSTER, h.clusterLeave);
        handlersRef.current = null;
      }

      // 3. Re-add source + layers (source was cleared by setStyle).
      //    Use cached GeoJSON if available for the current items.
      const currentItems = itemsRef.current;
      if (!geoJsonCacheRef.current || geoJsonCacheRef.current.items !== currentItems) {
        geoJsonCacheRef.current = { items: currentItems, data: toGeoJSON(currentItems) };
      }
      addSourceAndLayers(map, geoJsonCacheRef.current.data);

      // ── Cluster click → zoom in ────────────────────────────────────────
      const clusterClick: LayerHandler = async (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const clusterId: number = feat.properties?.cluster_id;
        try {
          // Cast to `any` — mapbox-gl v3 changed GeoJSONSource API types
          // but getClusterExpansionZoom still works at runtime.
          const zoom = await (map.getSource(SRC) as any)
            .getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: (feat.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom as number,
            duration: 500,
          });
        } catch { /* ignore */ }
      };

      // ── Point click → select item ──────────────────────────────────────
      const pointClick: LayerHandler = (e) => {
        const id = String(e.features?.[0]?.properties?.id ?? "");
        if (id) onSelectRef.current(id);
      };

      // ── Hover popup (individual points) ───────────────────────────────
      const pointEnter: LayerHandler = (e) => {
        map.getCanvas().style.cursor = "pointer";
        const feat = e.features?.[0];
        if (!feat) return;
        const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        // Escape to prevent XSS — names/orgs come from DB via GeoJSON properties
        const name = esc(feat.properties?.name ?? "");
        const org  = esc(feat.properties?.organization ?? "");

        popupRef.current?.remove();
        popupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
          className: "grant-map-popup",
        })
          .setLngLat(coords)
          .setHTML(
            `<div class="grant-popup-inner">` +
            `<strong>${name}</strong>` +
            (org ? `<span>${org}</span>` : "") +
            `</div>`
          )
          .addTo(map);
      };

      const pointLeave: LayerHandler = () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
        popupRef.current = null;
      };

      const clusterEnter: LayerHandler = () => { map.getCanvas().style.cursor = "pointer"; };
      const clusterLeave: LayerHandler = () => { map.getCanvas().style.cursor = ""; };

      // 4. Store new handler references
      handlersRef.current = {
        clusterClick, pointClick, pointEnter, pointLeave, clusterEnter, clusterLeave,
      };

      // 5. Register
      map.on("click",      LYR_CLUSTER, clusterClick);
      map.on("click",      LYR_POINTS,  pointClick);
      map.on("mouseenter", LYR_POINTS,  pointEnter);
      map.on("mouseleave", LYR_POINTS,  pointLeave);
      map.on("mouseenter", LYR_CLUSTER, clusterEnter);
      map.on("mouseleave", LYR_CLUSTER, clusterLeave);
    };

    map.on("style.load", setup);
    if (map.isStyleLoaded()) setup();

    return () => {
      map.off("style.load", setup);
      popupRef.current?.remove();
      // Remove layer event handlers on unmount to prevent leaks
      if (handlersRef.current) {
        const h = handlersRef.current;
        map.off("click",      LYR_CLUSTER, h.clusterClick);
        map.off("click",      LYR_POINTS,  h.pointClick);
        map.off("mouseenter", LYR_POINTS,  h.pointEnter);
        map.off("mouseleave", LYR_POINTS,  h.pointLeave);
        map.off("mouseenter", LYR_CLUSTER, h.clusterEnter);
        map.off("mouseleave", LYR_CLUSTER, h.clusterLeave);
        handlersRef.current = null;
      }
    };
  }, [map]); // re-run if the map instance itself changes

  // ── Reactive data update — fires when filtered items change ────────────────
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource(SRC) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    // Memoize GeoJSON conversion — only recompute if items array reference changed
    if (!geoJsonCacheRef.current || geoJsonCacheRef.current.items !== items) {
      geoJsonCacheRef.current = { items, data: toGeoJSON(items) };
    }
    src.setData(geoJsonCacheRef.current.data);
  }, [map, items]);
}
