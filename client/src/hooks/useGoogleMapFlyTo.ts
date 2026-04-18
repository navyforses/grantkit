/*
 * useGoogleMapFlyTo — Port of useMapFlyTo (Mapbox) to Google Maps.
 *
 * Drives the catalog map's camera from filter state:
 *   city > state > country > EU region > world.
 *
 * Design notes:
 *   • Google Maps has no single "flyTo with duration" like Mapbox.
 *     We combine panTo (smooth pan) with setZoom (discrete). This yields a
 *     natural-feeling jump that still reads as animated for the pan portion.
 *   • Coordinates come from the same `country-state-city` package that the
 *     Mapbox hook used, so filter behaviour stays identical.
 *   • Uses the same prev-ref trick as useMapFlyTo to distinguish "map just
 *     became ready" from "nothing changed" — so the very first navigation
 *     after mount still fires.
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

function coords(lat?: string | null, lng?: string | null): { lat: number; lng: number } | null {
  const la = parseFloat(lat ?? "");
  const lo = parseFloat(lng ?? "");
  return Number.isNaN(la) || Number.isNaN(lo) ? null : { lat: la, lng: lo };
}

/**
 * Watches map / regionCode / countryCode / stateCode / cityName and moves the
 * Google Maps camera whenever any value changes. Resets to world view when
 * all are cleared.
 */
export function useGoogleMapFlyTo(
  map: google.maps.Map | null,
  regionCode: string,
  countryCode: string,
  stateCode: string,
  cityName: string,
) {
  const prev = useRef({
    regionCode: "",
    countryCode: "",
    stateCode: "",
    cityName: "",
    map: null as google.maps.Map | null,
  });

  useEffect(() => {
    const p = prev.current;
    const locationUnchanged =
      p.regionCode === regionCode &&
      p.countryCode === countryCode &&
      p.stateCode === stateCode &&
      p.cityName === cityName;
    const mapUnchanged = p.map === map;
    if (locationUnchanged && mapUnchanged) return;

    prev.current = { regionCode, countryCode, stateCode, cityName, map };

    if (!map) return;

    const go = (center: { lat: number; lng: number }, zoom: number) => {
      map.panTo(center);
      map.setZoom(zoom);
    };

    // ── City ─────────────────────────────────────────────────────────────
    if (countryCode && stateCode && cityName) {
      const city = City.getCitiesOfState(countryCode, stateCode).find(
        (c) => c.name === cityName,
      );
      const c = coords(city?.latitude, city?.longitude);
      if (c) return go(c, CITY_ZOOM);
    }

    // ── State ────────────────────────────────────────────────────────────
    if (countryCode && stateCode) {
      const state = State.getStateByCodeAndCountry(stateCode, countryCode);
      const c = coords(state?.latitude, state?.longitude);
      if (c) return go(c, STATE_ZOOM);
    }

    // ── Specific country ─────────────────────────────────────────────────
    if (countryCode) {
      const country = Country.getCountryByCode(countryCode);
      const c = coords(country?.latitude, country?.longitude);
      if (c) return go(c, COUNTRY_ZOOM);
    }

    // ── EU region (no specific country) ──────────────────────────────────
    if (regionCode === "EU") {
      return go({ lat: EU_CENTER.lat, lng: EU_CENTER.lng }, EU_CENTER.zoom);
    }

    // ── World reset ──────────────────────────────────────────────────────
    go(WORLD_CENTER, WORLD_ZOOM);
  }, [map, regionCode, countryCode, stateCode, cityName]);
}
