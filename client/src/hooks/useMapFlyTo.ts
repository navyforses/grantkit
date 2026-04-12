/*
 * useMapFlyTo — Flies the Mapbox map to the selected location
 * whenever the map instance becomes ready OR countryCode / stateCode / cityName changes.
 *
 * Coordinate source: country-state-city (same package used in MapFilterPanel).
 * Priority: city > state > country > world reset.
 *
 * Accepts the map as state (not a ref) so the effect re-runs when the map becomes
 * available — handles initial page-load from URL params (e.g. /catalog?mc=US).
 * Tracks the previous map instance separately to distinguish "map just became ready"
 * from "nothing changed".
 */

import { useEffect, useRef } from "react";
import { Country, State, City } from "country-state-city";
import type mapboxgl from "mapbox-gl";

// ── Constants ────────────────────────────────────────────────────────────────

const WORLD_CENTER: [number, number] = [-40, 30];
const WORLD_ZOOM   = 1.5;
const COUNTRY_ZOOM = 3.5;
const STATE_ZOOM   = 5.5;
const CITY_ZOOM    = 10;
const FLY_DURATION = 1500; // ms

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse latitude/longitude strings from country-state-city into a Mapbox
 * [lng, lat] tuple.  Returns null when either value is missing or NaN.
 */
function coords(lat?: string | null, lng?: string | null): [number, number] | null {
  const la = parseFloat(lat ?? "");
  const lo = parseFloat(lng ?? "");
  return isNaN(la) || isNaN(lo) ? null : [lo, la];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Watches map / countryCode / stateCode / cityName and triggers a Mapbox flyTo
 * whenever any value changes.  Resets to world view when all are cleared.
 * Accepts the map instance as state (not a ref) so the effect re-runs when the
 * map becomes ready — this handles initial page-load with URL location params.
 *
 * @param map  The mapboxgl.Map instance (null while the map is still loading)
 */
export function useMapFlyTo(
  map: mapboxgl.Map | null,
  countryCode: string,
  stateCode: string,
  cityName: string,
) {
  // Track previous values AND the previous map instance so we can distinguish
  // "map just became ready" from "nothing changed".
  const prev = useRef({
    countryCode: "",
    stateCode: "",
    cityName: "",
    map: null as mapboxgl.Map | null,
  });

  useEffect(() => {
    const p = prev.current;
    const locationUnchanged =
      p.countryCode === countryCode &&
      p.stateCode === stateCode &&
      p.cityName === cityName;
    const mapUnchanged = p.map === map;

    // Nothing to do: same location, same map instance
    if (locationUnchanged && mapUnchanged) return;

    prev.current = { countryCode, stateCode, cityName, map };

    if (!map) return; // map not ready yet

    const fly = (center: [number, number], zoom: number) =>
      map.flyTo({ center, zoom, duration: FLY_DURATION, essential: true });

    // ── City (deepest scope wins) ─────────────────────────────────────────
    if (countryCode && stateCode && cityName) {
      const city = City.getCitiesOfState(countryCode, stateCode).find(
        (c) => c.name === cityName,
      );
      const c = coords(city?.latitude, city?.longitude);
      if (c) return void fly(c, CITY_ZOOM);
    }

    // ── State / Region ────────────────────────────────────────────────────
    if (countryCode && stateCode) {
      const state = State.getStateByCodeAndCountry(stateCode, countryCode);
      const c = coords(state?.latitude, state?.longitude);
      if (c) return void fly(c, STATE_ZOOM);
    }

    // ── Country ───────────────────────────────────────────────────────────
    if (countryCode) {
      const country = Country.getCountryByCode(countryCode);
      const c = coords(country?.latitude, country?.longitude);
      if (c) return void fly(c, COUNTRY_ZOOM);
    }

    // ── World reset ───────────────────────────────────────────────────────
    fly(WORLD_CENTER, WORLD_ZOOM);

  }, [map, countryCode, stateCode, cityName]);
}
