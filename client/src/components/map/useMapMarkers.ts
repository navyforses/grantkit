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
  itemsRef.current    = items;
  onSelectRef.current = onSelectItem;

  // ── Layer setup — runs once per map instance, re-runs on style.load ────────
  useEffect(() => {
    if (!map) return;

    const setup = () => {
      // Remove any lingering popup from before the style reload
      popupRef.current?.remove();
      popupRef.current = null;

      addSourceAndLayers(map, toGeoJSON(itemsRef.current));

      // ── Cluster click → zoom in ──────────────────────────────────────────
      const onClusterClick = async (e: mapboxgl.MapLayerMouseEvent) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const clusterId: number = feat.properties?.cluster_id;
        try {
          const zoom = await (map.getSource(SRC) as mapboxgl.GeoJSONSource)
            .getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: (feat.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
            duration: 500,
          });
        } catch { /* ignore */ }
      };

      // ── Point click → select item ────────────────────────────────────────
      const onPointClick = (e: mapboxgl.MapLayerMouseEvent) => {
        const id = String(e.features?.[0]?.properties?.id ?? "");
        if (id) onSelectRef.current(id);
      };

      // ── Hover popup (individual points) ──────────────────────────────────
      const onPointEnter = (e: mapboxgl.MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const feat = e.features?.[0];
        if (!feat) return;
        const coords = (feat.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const name: string = feat.properties?.name ?? "";
        const org:  string = feat.properties?.organization ?? "";

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

      const onPointLeave = () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
        popupRef.current = null;
      };

      const onClusterEnter = () => { map.getCanvas().style.cursor = "pointer"; };
      const onClusterLeave = () => { map.getCanvas().style.cursor = ""; };

      map.on("click",      LYR_CLUSTER, onClusterClick);
      map.on("click",      LYR_POINTS,  onPointClick);
      map.on("mouseenter", LYR_POINTS,  onPointEnter);
      map.on("mouseleave", LYR_POINTS,  onPointLeave);
      map.on("mouseenter", LYR_CLUSTER, onClusterEnter);
      map.on("mouseleave", LYR_CLUSTER, onClusterLeave);
    };

    map.on("style.load", setup);
    if (map.isStyleLoaded()) setup();

    return () => {
      map.off("style.load", setup);
      popupRef.current?.remove();
    };
  }, [map]); // re-run if the map instance itself changes

  // ── Reactive data update — fires when filtered items change ────────────────
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource(SRC) as mapboxgl.GeoJSONSource | undefined;
    src?.setData(toGeoJSON(items));
  }, [map, items]);
}
