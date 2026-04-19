/*
 * useGeocodedAddress — client-side fallback geocoder.
 *
 * When a grant row has `latitude` + `longitude` already populated (from the
 * Phase 2 batch geocoding pipeline), this hook just echoes those back
 * synchronously. When it does not, we resolve a free-text address through
 * the Google Maps Geocoder JS API on mount and cache the result in
 * sessionStorage so navigating back to the same grant is instant.
 *
 * Why sessionStorage (not localStorage)?
 *   • Coords are derived from mutable data (org moves offices; admin fixes
 *     a typo). Clearing on tab close is a reasonable correctness floor.
 *   • Storage quota is per-origin and tiny (~1 KB per entry) so there is
 *     no practical ceiling to worry about.
 *
 * Why not put this inside LocationMap?
 *   • Keeps the map component pure — it takes coords and renders. The
 *     "where does the coord come from" decision belongs with the detail
 *     page that knows the full address context.
 *   • The hook's loading state also lets the caller render a skeleton of
 *     the right size, avoiding the layout shift that would happen if
 *     LocationMap mounted then un-mounted on geocode failure.
 */

import { useEffect, useRef, useState } from "react";
import { googleMapsReady, loadGoogleMaps } from "@/lib/googleMapsLoader";

interface GeocodedAddressInput {
  /** Human-readable address — "{org}, {address/city/state/country}". */
  address: string;
  /** Optional pre-computed coords from the DB (Phase 2 pipeline output). */
  fallbackLat?: number | null;
  /** Optional pre-computed coords from the DB. */
  fallbackLng?: number | null;
}

export interface GeocodedAddressResult {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  /** True when the geocoder returned ZERO_RESULTS or failed network-wise. */
  error: boolean;
}

const CACHE_PREFIX = "geocode:v1:";

/** Retrieve a cached geocode result, if present. */
function readCache(key: string): { lat: number; lng: number } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat: number; lng: number };
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lng)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCache(key: string, lat: number, lng: number) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ lat, lng }));
  } catch {
    // sessionStorage can throw when disabled or over quota — safe to ignore;
    // we just re-geocode next time.
  }
}

export function useGeocodedAddress({
  address,
  fallbackLat,
  fallbackLng,
}: GeocodedAddressInput): GeocodedAddressResult {
  // Coerce string decimals (Drizzle shape) or unexpected numbers to null.
  const providedLat = toFiniteNumber(fallbackLat);
  const providedLng = toFiniteNumber(fallbackLng);
  const hasProvidedCoords = providedLat !== null && providedLng !== null;

  const [state, setState] = useState<GeocodedAddressResult>(() => {
    if (hasProvidedCoords) {
      return { lat: providedLat, lng: providedLng, loading: false, error: false };
    }
    // Check cache synchronously on mount so the common case (already
    // geocoded in this session) skips the loading flash entirely.
    const cached = address.trim() ? readCache(address.trim()) : null;
    if (cached) {
      return { lat: cached.lat, lng: cached.lng, loading: false, error: false };
    }
    return {
      lat: null,
      lng: null,
      loading: !!address.trim() && googleMapsReady,
      error: false,
    };
  });

  // Track the latest requested address so racing requests on fast
  // navigation don't overwrite a newer result with a stale one.
  const addressRef = useRef(address);
  addressRef.current = address;

  useEffect(() => {
    // Provided coords win immediately.
    if (hasProvidedCoords) {
      setState({ lat: providedLat, lng: providedLng, loading: false, error: false });
      return;
    }

    const q = address.trim();
    if (!q) {
      setState({ lat: null, lng: null, loading: false, error: false });
      return;
    }

    // Check cache again in case the address prop changed between mount
    // and this effect firing.
    const cached = readCache(q);
    if (cached) {
      setState({ lat: cached.lat, lng: cached.lng, loading: false, error: false });
      return;
    }

    if (!googleMapsReady) {
      setState({ lat: null, lng: null, loading: false, error: true });
      return;
    }

    setState({ lat: null, lng: null, loading: true, error: false });

    let cancelled = false;
    loadGoogleMaps<google.maps.GeocodingLibrary>("geocoding")
      .then(({ Geocoder }) => {
        if (cancelled) return;
        const geocoder = new Geocoder();
        geocoder.geocode({ address: q }, (results, status) => {
          if (cancelled) return;
          // If the address prop has since changed, drop this stale result.
          if (addressRef.current.trim() !== q) return;
          if (status === "OK" && results && results[0]) {
            const loc = results[0].geometry.location;
            const lat = loc.lat();
            const lng = loc.lng();
            writeCache(q, lat, lng);
            setState({ lat, lng, loading: false, error: false });
          } else {
            setState({ lat: null, lng: null, loading: false, error: true });
          }
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ lat: null, lng: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
    // providedLat/Lng are primitives — safe to include directly.
  }, [address, hasProvidedCoords, providedLat, providedLng]);

  return state;
}

function toFiniteNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
