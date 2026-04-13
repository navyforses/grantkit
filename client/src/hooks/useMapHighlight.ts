/*
 * useMapHighlight — Country polygon highlight on the Mapbox map.
 *
 * Uses Mapbox's built-in `mapbox.country-boundaries-v1` vector tileset to draw
 * a translucent fill + border over the selected country.
 *
 * Behaviour:
 *   • Highlight appears when countryCode is non-empty.
 *   • Opacity dims when stateCode or cityName is also set (flyTo already zoomed in).
 *   • Layers are recreated after style.load (dark ↔ light toggle) because
 *     setStyle() wipes all user-added sources + layers.
 *   • Source + layers are removed on unmount.
 */

import { useEffect } from "react";
import type mapboxgl from "mapbox-gl";
import { EU_MEMBER_CODES } from "@/lib/constants";

// ── Constants ────────────────────────────────────────────────────────────────

const SRC    = "country-boundaries";
const FILL   = "country-highlight-fill";
const BORDER = "country-highlight-border";

// Primary accent colour (green — distinct from the indigo marker circles)
const HIGHLIGHT_COLOR = "#10b981";

// Mapbox standard styles have this layer; insert our layers just below it
// so highlight renders beneath country name labels.
const BEFORE_LAYER = "admin-1-boundary-bg";

// ── Helpers ──────────────────────────────────────────────────────────────────

function addSourceAndLayers(map: mapboxgl.Map) {
  if (!map.getSource(SRC)) {
    map.addSource(SRC, {
      type: "vector",
      url: "mapbox://mapbox.country-boundaries-v1",
    });
  }

  const beforeId = map.getLayer(BEFORE_LAYER) ? BEFORE_LAYER : undefined;

  if (!map.getLayer(FILL)) {
    map.addLayer(
      {
        id: FILL,
        type: "fill",
        source: SRC,
        "source-layer": "country_boundaries",
        // Start with no country selected — filter set separately
        filter: ["==", ["get", "iso_3166_1"], ""],
        paint: {
          "fill-color": HIGHLIGHT_COLOR,
          "fill-opacity": 0.12,
        },
      },
      beforeId,
    );
  }

  if (!map.getLayer(BORDER)) {
    map.addLayer(
      {
        id: BORDER,
        type: "line",
        source: SRC,
        "source-layer": "country_boundaries",
        filter: ["==", ["get", "iso_3166_1"], ""],
        paint: {
          "line-color": HIGHLIGHT_COLOR,
          "line-width": 2,
          "line-opacity": 0.4,
        },
      },
      beforeId,
    );
  }
}

function removeSourceAndLayers(map: mapboxgl.Map) {
  if (map.getLayer(BORDER)) map.removeLayer(BORDER);
  if (map.getLayer(FILL))   map.removeLayer(FILL);
  if (map.getSource(SRC))   map.removeSource(SRC);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Adds/maintains a country highlight (fill + border) on the map.
 *
 * When regionCode="EU" and countryCode is empty, highlights all 27 EU members.
 * When countryCode is set, highlights only that country.
 */
export function useMapHighlight(
  map: mapboxgl.Map | null,
  regionCode: string,
  countryCode: string,
  stateCode: string,
  cityName: string,
) {
  // ── Layer setup: recreate source + layers on style.load ──────────────────
  useEffect(() => {
    if (!map) return;

    const setup = () => {
      addSourceAndLayers(map);
      // After recreation apply the current filter immediately
      applyFilter(map, regionCode, countryCode, stateCode, cityName);
    };

    map.on("style.load", setup);
    if (map.isStyleLoaded()) setup();

    return () => {
      map.off("style.load", setup);
      removeSourceAndLayers(map);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // ── Reactive filter update ────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;
    if (!map.getLayer(FILL)) return;

    applyFilter(map, regionCode, countryCode, stateCode, cityName);
  }, [map, regionCode, countryCode, stateCode, cityName]);
}

// ── Pure filter/paint updater (called from both effects) ──────────────────

function applyFilter(
  map: mapboxgl.Map,
  regionCode: string,
  countryCode: string,
  stateCode: string,
  cityName: string,
) {
  const dimmed = !!(stateCode || cityName);

  if (regionCode === "EU" && !countryCode) {
    // Highlight all 27 EU member countries simultaneously
    const filter: mapboxgl.FilterSpecification = ["in", ["get", "iso_3166_1"], ["literal", EU_MEMBER_CODES]];
    map.setFilter(FILL,   filter);
    map.setFilter(BORDER, filter);
    map.setPaintProperty(FILL,   "fill-opacity",  0.10);
    map.setPaintProperty(BORDER, "line-opacity",   0.35);
  } else if (countryCode) {
    // Single country
    const filter: mapboxgl.FilterSpecification = ["==", ["get", "iso_3166_1"], countryCode];
    map.setFilter(FILL,   filter);
    map.setFilter(BORDER, filter);
    map.setPaintProperty(FILL,   "fill-opacity",  dimmed ? 0.05 : 0.12);
    map.setPaintProperty(BORDER, "line-opacity",   dimmed ? 0.18 : 0.40);
  } else {
    // Nothing selected — hide
    const noMatch: mapboxgl.FilterSpecification = ["==", ["get", "iso_3166_1"], ""];
    map.setFilter(FILL,   noMatch);
    map.setFilter(BORDER, noMatch);
  }
}
