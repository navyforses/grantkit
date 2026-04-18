/*
 * Google Maps JavaScript API — singleton loader.
 *
 * One Loader instance per tab. Subsequent calls return the cached promise so
 * the script tag is only injected once even if LocationMap and MapPanel mount
 * simultaneously or a route transition remounts a map.
 *
 * Libraries loaded:
 *   - "maps"    (core) — google.maps.Map
 *   - "marker"        — google.maps.marker.AdvancedMarkerElement
 *   - "places"        — reserved for autocomplete features later
 *
 * Consumers:
 *   const { Map } = await loadGoogleMaps("maps");
 *   const { AdvancedMarkerElement } = await loadGoogleMaps("marker");
 */

import { Loader, type Library } from "@googlemaps/js-api-loader";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const MAP_ID_RAW = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;

/**
 * Vector Map ID — required for AdvancedMarkerElement.
 * Falls back to Google's public DEMO_MAP_ID so devs can see pins without
 * provisioning a Cloud Console map first.
 */
export const GOOGLE_MAP_ID: string = (MAP_ID_RAW && MAP_ID_RAW.trim()) || "DEMO_MAP_ID";

/** True when a real API key is configured. Components use this to render a fallback. */
export const googleMapsReady: boolean = Boolean(API_KEY && API_KEY.startsWith("AIza"));

let loader: Loader | null = null;
const libCache = new Map<Library, Promise<unknown>>();

function getLoader(): Loader {
  if (loader) return loader;
  if (!API_KEY) {
    throw new Error(
      "VITE_GOOGLE_MAPS_BROWSER_KEY is not set — cannot initialize Google Maps.",
    );
  }
  loader = new Loader({
    apiKey: API_KEY,
    // "quarterly" — stable release channel. "weekly" introduced an
    // AdvancedMarkerElement regression ("Cannot read properties of undefined
    // (reading 'getRootNode')") reproducible in non-English locale bundles
    // (observed with ka_ALL). Quarterly is published every ~3 months and is
    // the recommended channel for production apps.
    version: "quarterly",
    // We pre-warm these at first use; individual callers still request their slice.
    libraries: ["maps", "marker", "places"],
  });
  return loader;
}

/**
 * Import a specific Google Maps library.
 * Results are cached — calling twice for the same library reuses the first promise.
 */
export async function loadGoogleMaps<T = google.maps.MapsLibrary>(
  library: Library,
): Promise<T> {
  const cached = libCache.get(library);
  if (cached) return cached as Promise<T>;
  const p = getLoader().importLibrary(library) as Promise<T>;
  libCache.set(library, p as Promise<unknown>);
  return p;
}

/** Convenience — load the libraries most components need in parallel. */
export async function loadMapsAndMarker(): Promise<{
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
}> {
  const [maps, marker] = await Promise.all([
    loadGoogleMaps<google.maps.MapsLibrary>("maps"),
    loadGoogleMaps<google.maps.MarkerLibrary>("marker"),
  ]);
  return { maps, marker };
}
