/*
 * useGoogleMapFlyTo — Port of useMapFlyTo (Mapbox) to Google Maps.
 *
 * Drives the catalog map's camera from filter state:
 *   city > state > country > EU region > world.
 *
 * Phase 4C update: when the filtered marker set has arrived, prefer
 * `fitBounds(actualMarkers)` over a fixed zoom level. The fixed
 * COUNTRY/STATE/CITY zooms (4 / 6 / 11) frequently looked too loose
 * — picking "France" used to land on a France-wide zoom even though
 * the matching organizations only spanned Paris + a couple of cities.
 * fitBounds caps with a per-filter `maxZoom` so single-result filters
 * don't slam to street level.
 *
 * Design notes:
 *   • Fallback path (no markers yet, or no filter active) keeps the
 *     original panTo + setZoom behaviour so the camera still moves
 *     immediately on filter change while data is loading.
 *   • Coordinates come from the same `country-state-city` package that
 *     the Mapbox hook used, so the fallback behaviour stays identical.
 *   • Uses the same prev-ref trick as useMapFlyTo to distinguish "map
 *     just became ready" from "nothing changed" — so the very first
 *     navigation after mount still fires.
 */

import { useEffect, useRef } from "react";
import { Country, State, City } from "country-state-city";
import { EU_CENTER } from "@/lib/constants";

// ── Camera constants (matched to the Mapbox hook's semantics) ──────────────
const WORLD_CENTER = { lat: 20, lng: 0 };
const WORLD_ZOOM = 2;
const COUNTRY_ZOOM = 4;
const STATE_ZOOM = 6;
const CITY_ZOOM = 11;

// fitBounds maxZoom caps — keep single-marker filters from over-zooming.
const MAX_ZOOM_REGION = 5;
const MAX_ZOOM_COUNTRY = 8;
const MAX_ZOOM_STATE = 11;
const MAX_ZOOM_CITY = 14;

const FIT_PADDING = 56; // px

interface MapItem {
  latitude?: number | string | null;
  longitude?: number | string | null;
}

function coords(lat?: string | null, lng?: string | null): { lat: number; lng: number } | null {
  const la = parseFloat(lat ?? "");
  const lo = parseFloat(lng ?? "");
  return Number.isNaN(la) || Number.isNaN(lo) ? null : { lat: la, lng: lo };
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build a LatLngBounds from the filtered map items. Returns null if no
 * valid coordinates are present.
 */
function buildBounds(items: ReadonlyArray<MapItem>): google.maps.LatLngBounds | null {
  const bounds = new google.maps.LatLngBounds();
  let count = 0;
  for (const it of items) {
    const lat = toNum(it.latitude);
    const lng = toNum(it.longitude);
    if (lat === null || lng === null) continue;
    // Reject the same "null island" as the server does, in case stale data
    // slips through.
    if (lat === 0 && lng === 0) continue;
    bounds.extend({ lat, lng });
    count++;
  }
  return count > 0 ? bounds : null;
}

/**
 * After fitBounds, cap the resulting zoom. Google Maps' fitBounds has no
 * built-in maxZoom — listen once for the next idle and step back if needed.
 */
function fitBoundsCapped(
  map: google.maps.Map,
  bounds: google.maps.LatLngBounds,
  maxZoom: number,
) {
  const listener = google.maps.event.addListenerOnce(map, "idle", () => {
    const z = map.getZoom();
    if (typeof z === "number" && z > maxZoom) {
      map.setZoom(maxZoom);
    }
  });
  // Suppress lint: listener is intentionally fire-and-forget.
  void listener;
  map.fitBounds(bounds, FIT_PADDING);
}

/**
 * Watches map / regionCode / countryCode / stateCode / cityName and moves
 * the Google Maps camera whenever any value changes. Resets to world view
 * when all are cleared. When `items` is provided and non-empty, fitBounds
 * the actual filtered markers (capped per filter level) instead of the
 * fixed COUNTRY/STATE/CITY_ZOOM values.
 */
export function useGoogleMapFlyTo(
  map: google.maps.Map | null,
  regionCode: string,
  countryCode: string,
  stateCode: string,
  cityName: string,
  items: ReadonlyArray<MapItem> = [],
) {
  const prev = useRef({
    regionCode: "",
    countryCode: "",
    stateCode: "",
    cityName: "",
    map: null as google.maps.Map | null,
    itemsKey: "",
  });

  // Cheap fingerprint of the items array — length + first/last id-ish hash.
  // Avoids re-fitting on every parent re-render that returns the same logical
  // set. We can't use referential equality because the parent rebuilds the
  // array via useMemo on every query result.
  const itemsKey = `${items.length}:${items[0]?.latitude ?? ""},${items[0]?.longitude ?? ""}|${items[items.length - 1]?.latitude ?? ""},${items[items.length - 1]?.longitude ?? ""}`;

  useEffect(() => {
    const p = prev.current;
    const locationUnchanged =
      p.regionCode === regionCode &&
      p.countryCode === countryCode &&
      p.stateCode === stateCode &&
      p.cityName === cityName;
    const mapUnchanged = p.map === map;
    const itemsUnchanged = p.itemsKey === itemsKey;
    if (locationUnchanged && mapUnchanged && itemsUnchanged) return;

    const locationChanged = !locationUnchanged;
    const itemsChanged = !itemsUnchanged;
    prev.current = { regionCode, countryCode, stateCode, cityName, map, itemsKey };

    if (!map) return;

    const go = (center: { lat: number; lng: number }, zoom: number) => {
      map.panTo(center);
      map.setZoom(zoom);
    };

    // ── Prefer fitBounds(filtered markers) when items are present ────────
    //
    // BUT: when only the filter changed (items haven't refreshed yet) we'd
    // be fitting to STALE markers from the previous filter — e.g., picking
    // "FR" while items still hold US points yanks the camera over Texas.
    // In that case fall through to the geo-center pan; the next fire
    // (triggered by the items refresh) will tighten via fitBounds.
    const anyFilter = !!(regionCode || countryCode || stateCode || cityName);
    const itemsAreFresh = !locationChanged || itemsChanged;
    if (anyFilter && items.length > 0 && itemsAreFresh) {
      const bounds = buildBounds(items);
      if (bounds) {
        let cap = MAX_ZOOM_COUNTRY;
        if (cityName) cap = MAX_ZOOM_CITY;
        else if (stateCode) cap = MAX_ZOOM_STATE;
        else if (countryCode) cap = MAX_ZOOM_COUNTRY;
        else if (regionCode) cap = MAX_ZOOM_REGION;
        fitBoundsCapped(map, bounds, cap);
        return;
      }
    }

    // ── Fallback: pan to the geographic centroid of the chosen scope ─────
    // (used while items are still loading, when items are stale relative to
    // the just-changed filter, or when the filter matched zero
    // organizations).

    if (countryCode && stateCode && cityName) {
      const city = City.getCitiesOfState(countryCode, stateCode).find(
        (c) => c.name === cityName,
      );
      const c = coords(city?.latitude, city?.longitude);
      if (c) return go(c, CITY_ZOOM);
    }

    if (countryCode && cityName && !stateCode) {
      const city = City.getCitiesOfCountry(countryCode)?.find(
        (c) => c.name === cityName,
      );
      const c = coords(city?.latitude, city?.longitude);
      if (c) return go(c, CITY_ZOOM);
    }

    if (countryCode && stateCode) {
      const state = State.getStateByCodeAndCountry(stateCode, countryCode);
      const c = coords(state?.latitude, state?.longitude);
      if (c) return go(c, STATE_ZOOM);
    }

    if (countryCode) {
      const country = Country.getCountryByCode(countryCode);
      const c = coords(country?.latitude, country?.longitude);
      if (c) return go(c, COUNTRY_ZOOM);
    }

    if (regionCode === "EU") {
      return go({ lat: EU_CENTER.lat, lng: EU_CENTER.lng }, EU_CENTER.zoom);
    }

    go(WORLD_CENTER, WORLD_ZOOM);
  }, [map, regionCode, countryCode, stateCode, cityName, itemsKey, items]);
}
