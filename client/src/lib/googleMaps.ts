/*
 * Google Maps deep-link helpers.
 *
 * Opens a grant's location on Google Maps (web or native app on mobile).
 * Used by LocationMap, MapPanel popups, and the GrantDetail page.
 *
 * Strategy:
 *   - Address present → search by "{org}, {address}" (more accurate than coords alone)
 *   - Coords only      → search by "{lat},{lng}"
 *   - Neither          → no-op (caller should hide the link)
 *
 * Mobile fallback:
 *   - iOS:     try `maps://?q=lat,lng` (Apple Maps), then web after 1.5s
 *   - Android: try `geo:lat,lng` (any installed maps app), then web after 1.5s
 *   - Desktop: open web URL in a new tab
 *
 * Why the timeout fallback?
 *   The native scheme silently no-ops if no app is registered. The web URL
 *   is opened a moment later so the user always lands somewhere. This is a
 *   well-known pattern; cleaner than visibility-change tricks.
 */

export interface MapLocation {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  organization?: string | null;
}

const NATIVE_FALLBACK_MS = 1500;

/** Open the location in Google Maps (search view). */
export function openInGoogleMaps(loc: MapLocation): void {
  const query = buildQuery(loc);
  if (!query) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
  openUrlWithMobileAppFallback(url, loc);
}

/** Open Google Maps directions to the location (from user's current position). */
export function openInGoogleMapsDirections(loc: MapLocation): void {
  const query = buildQuery(loc);
  if (!query) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  openUrlWithMobileAppFallback(url, loc);
}

/** Returns true if there is enough info to open the location on a map. */
export function hasMapLocation(loc: MapLocation): boolean {
  return buildQuery(loc) !== null;
}

function buildQuery(loc: MapLocation): string | null {
  if (loc.address && loc.address.trim()) {
    const parts = [loc.organization, loc.address].filter(
      (p): p is string => typeof p === "string" && p.trim().length > 0,
    );
    return encodeURIComponent(parts.join(", "));
  }
  const lat = toFiniteNumber(loc.latitude);
  const lng = toFiniteNumber(loc.longitude);
  if (lat !== null && lng !== null) {
    return `${lat},${lng}`;
  }
  return null;
}

function toFiniteNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function openUrlWithMobileAppFallback(webUrl: string, loc: MapLocation): void {
  if (typeof window === "undefined") return;

  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const lat = toFiniteNumber(loc.latitude);
  const lng = toFiniteNumber(loc.longitude);

  if ((isIOS || isAndroid) && lat !== null && lng !== null) {
    const nativeUrl = isIOS
      ? `maps://?q=${lat},${lng}`
      : `geo:${lat},${lng}?q=${lat},${lng}`;
    window.location.href = nativeUrl;
    window.setTimeout(() => {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }, NATIVE_FALLBACK_MS);
  } else {
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }
}
