/*
 * useMapFlyTo — Flies the Mapbox map to the selected location
 * whenever countryCode / stateCode / cityName changes.
 *
 * Coordinate source: country-state-city (same package used in MapFilterPanel).
 * Priority: city > state > country > world reset.
 * Only fires when values actually change — skips the initial render.
 */

import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { Country, State, City } from "country-state-city";
import type mapboxgl from "mapbox-gl";

// ── Constants ────────────────────────────────────────────────────────────────

const WORLD_CENTER: [number, number] = [20, 0];
const WORLD_ZOOM   = 1.8;
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
 * Watches countryCode / stateCode / cityName and triggers a Mapbox flyTo
 * whenever any value changes.  Resets to world view when all are cleared.
 *
 * @param mapRef  Ref that holds the mapboxgl.Map instance (may be null before load)
 */
export function useMapFlyTo(
  mapRef: MutableRefObject<mapboxgl.Map | null>,
  countryCode: string,
  stateCode: string,
  cityName: string,
) {
  // Track previous values so we skip the initial mount (map still loading then)
  const prev = useRef({ countryCode: "", stateCode: "", cityName: "" });

  useEffect(() => {
    const p = prev.current;
    if (p.countryCode === countryCode && p.stateCode === stateCode && p.cityName === cityName) {
      return; // nothing changed
    }
    prev.current = { countryCode, stateCode, cityName };

    const map = mapRef.current;
    if (!map) return;

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

  // mapRef is a stable ref — intentionally excluded from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, stateCode, cityName]);
}
