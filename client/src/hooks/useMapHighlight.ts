/*
 * useMapHighlight — Country polygon highlight + state/city circle glow.
 *
 * Country level : mapbox.country-boundaries-v1 vector tileset (fill + border).
 * State / city  : GeoJSON point + circle layer (pixel-radius "spotlight" glow),
 *                 because Mapbox standard tilesets have no sub-national polygons.
 *
 * Behaviour:
 *   • Country highlight (fill + border) appears when countryCode or regionCode="EU" is set.
 *   • State glow (large soft circle at centroid) appears when stateCode is set.
 *   • City glow (tighter circle) overrides state glow when cityName is set.
 *   • Layers are recreated after style.load (dark ↔ light toggle wipes user layers).
 *   • All sources + layers are removed on unmount.
 */

import { useEffect } from "react";
import type mapboxgl from "mapbox-gl";
import { State, City } from "country-state-city";
import { EU_MEMBER_CODES } from "@/lib/constants";

// ── Constants ────────────────────────────────────────────────────────────────

const SRC    = "country-boundaries";
const FILL   = "country-highlight-fill";
const BORDER = "country-highlight-border";

const FOCUS_SRC    = "location-focus";
const FOCUS_CIRCLE = "location-focus-circle";

// Primary accent colour (green — distinct from the indigo marker circles)
const HIGHLIGHT_COLOR = "#10b981";

// Mapbox standard styles have this layer; insert country layers just below it
// so the highlight renders beneath country name labels.
const BEFORE_LAYER = "admin-1-boundary-bg";

// ── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function emptyFC(): any {
  return { type: "FeatureCollection", features: [] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makePoint(lngLat: [number, number]): any {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: lngLat },
        properties: {},
      },
    ],
  };
}

function parseCoords(lat?: string | null, lng?: string | null): [number, number] | null {
  const la = parseFloat(lat ?? "");
  const lo = parseFloat(lng ?? "");
  return isNaN(la) || isNaN(lo) ? null : [lo, la];
}

function addSourceAndLayers(map: mapboxgl.Map) {
  // ── Country polygon source + layers ───────────────────────────────────────

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

  // ── State / city focus circle source + layer ──────────────────────────────

  if (!map.getSource(FOCUS_SRC)) {
    map.addSource(FOCUS_SRC, {
      type: "geojson",
      data: emptyFC(),
    });
  }

  if (!map.getLayer(FOCUS_CIRCLE)) {
    map.addLayer({
      id: FOCUS_CIRCLE,
      type: "circle",
      source: FOCUS_SRC,
      paint: {
        "circle-radius": 80,
        "circle-color": HIGHLIGHT_COLOR,
        "circle-opacity": 0.10,
        "circle-stroke-width": 2,
        "circle-stroke-color": HIGHLIGHT_COLOR,
        "circle-stroke-opacity": 0.35,
        "circle-pitch-alignment": "map",
        "circle-blur": 0.8,
      },
    });
  }
}

function removeSourceAndLayers(map: mapboxgl.Map) {
  if (map.getLayer(FOCUS_CIRCLE)) map.removeLayer(FOCUS_CIRCLE);
  if (map.getSource(FOCUS_SRC))   map.removeSource(FOCUS_SRC);
  if (map.getLayer(BORDER))       map.removeLayer(BORDER);
  if (map.getLayer(FILL))         map.removeLayer(FILL);
  if (map.getSource(SRC))         map.removeSource(SRC);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Adds/maintains country, state, and city highlights on the map.
 *
 * - regionCode="EU" + no countryCode → highlights all 27 EU members
 * - countryCode set → highlights that country polygon
 * - stateCode set  → adds soft glow circle at the state centroid
 * - cityName set   → replaces state glow with tighter circle at city coords
 */
export function useMapHighlight(
  map: mapboxgl.Map | null,
  regionCode: string,
  countryCode: string,
  stateCode: string,
  cityName: string,
) {
  // ── Layer setup: recreate sources + layers on style.load ──────────────────
  useEffect(() => {
    if (!map) return;

    const setup = () => {
      addSourceAndLayers(map);
      applyHighlight(map, regionCode, countryCode, stateCode, cityName);
    };

    // Same guarantee as useMapMarkers: onMapReady fires from style.load,
    // so by the time this effect runs the style is already loaded.
    // Never use isStyleLoaded() — known to be unreliable (#8691, #6708).
    map.on("style.load", setup); // re-runs on dark ↔ light switch
    setup();                     // initial load — style already loaded

    return () => {
      map.off("style.load", setup);
      removeSourceAndLayers(map);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // ── Reactive update on location change ────────────────────────────────────
  useEffect(() => {
    if (!map) return;
    if (!map.getLayer(FILL)) return; // layers not ready yet — setup() will call applyHighlight

    applyHighlight(map, regionCode, countryCode, stateCode, cityName);
  }, [map, regionCode, countryCode, stateCode, cityName]);
}

// ── Combined highlight updater ────────────────────────────────────────────────

function applyHighlight(
  map: mapboxgl.Map,
  regionCode: string,
  countryCode: string,
  stateCode: string,
  cityName: string,
) {
  applyCountryFilter(map, regionCode, countryCode, stateCode, cityName);
  applyFocusCircle(map, regionCode, countryCode, stateCode, cityName);
}

// ── Country polygon filter / opacity ─────────────────────────────────────────

function applyCountryFilter(
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

// ── State / city focus circle ─────────────────────────────────────────────────

function applyFocusCircle(
  map: mapboxgl.Map,
  regionCode: string,
  countryCode: string,
  stateCode: string,
  cityName: string,
) {
  const src = map.getSource(FOCUS_SRC) as mapboxgl.GeoJSONSource | undefined;
  if (!src) return;

  // Determine ISO-2 country code for country-state-city lookups
  const iso = regionCode === "US" ? "US"
            : regionCode === "GB" ? "GB"
            : countryCode;

  // ── City level — tight circle (zoom ~10) ─────────────────────────────────
  if (iso && stateCode && cityName) {
    const city = City.getCitiesOfState(iso, stateCode).find((c) => c.name === cityName);
    const pt = parseCoords(city?.latitude, city?.longitude);
    if (pt) {
      src.setData(makePoint(pt));
      map.setPaintProperty(FOCUS_CIRCLE, "circle-radius",         55);
      map.setPaintProperty(FOCUS_CIRCLE, "circle-opacity",        0.18);
      map.setPaintProperty(FOCUS_CIRCLE, "circle-stroke-opacity", 0.55);
      map.setPaintProperty(FOCUS_CIRCLE, "circle-blur",           0.6);
      return;
    }
  }

  // ── State level — large soft halo (zoom ~5.5) ────────────────────────────
  if (iso && stateCode) {
    const state = State.getStateByCodeAndCountry(stateCode, iso);
    const pt = parseCoords(state?.latitude, state?.longitude);
    if (pt) {
      src.setData(makePoint(pt));
      map.setPaintProperty(FOCUS_CIRCLE, "circle-radius",         110);
      map.setPaintProperty(FOCUS_CIRCLE, "circle-opacity",        0.09);
      map.setPaintProperty(FOCUS_CIRCLE, "circle-stroke-opacity", 0.30);
      map.setPaintProperty(FOCUS_CIRCLE, "circle-blur",           0.8);
      return;
    }
  }

  // ── Nothing to show — clear the focus layer ───────────────────────────────
  src.setData(emptyFC());
}
