/*
 * Google Maps deep-link helpers (Phase 6 — Kenji audit).
 *
 * Opens a grant's location on Google Maps (web), or prefers a native maps
 * app on mobile when one is installed. Used by:
 *   - GrantDetail.tsx     → "Get Directions" button
 *   - LocationMap.tsx     → InfoWindow "Open in Google Maps" link
 *   - (any future call site that needs a single-click jump to maps)
 *
 * URL strategy (per OS, per mode):
 *
 *   ┌──────────┬───────────────────┬──────────────────────────────┬──────────────────────────┐
 *   │ Platform │ Mode              │ Native scheme                │ Web fallback             │
 *   ├──────────┼───────────────────┼──────────────────────────────┼──────────────────────────┤
 *   │ iOS      │ search            │ maps://?q=<query>            │ google.com/maps/search   │
 *   │ iOS      │ directions        │ maps://?daddr=<query>        │ google.com/maps/dir      │
 *   │ Android  │ search            │ geo:0,0?q=<query>            │ google.com/maps/search   │
 *   │ Android  │ directions        │ google.navigation:q=<query>  │ google.com/maps/dir      │
 *   │ Desktop  │ both              │ —                            │ google.com/maps/...      │
 *   └──────────┴───────────────────┴──────────────────────────────┴──────────────────────────┘
 *
 *   <query> is one of:
 *     • "{org}, {address}" when an address is present (most accurate)
 *     • "{lat},{lng}"      when only coordinates are present
 *     • null               when neither is present (caller is a no-op)
 *
 * Native fallback contract:
 *   1. If native scheme is attempted, a 1500 ms timer is armed to open the
 *      web URL. This guarantees the user lands somewhere even if no app
 *      has registered the scheme.
 *   2. We listen for `visibilitychange` and `pagehide`. When either fires
 *      with `document.hidden` true, the native app launched successfully
 *      and we cancel the timer — the user never sees the web tab open.
 *   3. The web fallback always uses `noopener,noreferrer` and `_blank`.
 *
 * Why not Apple-Maps-only on iOS?
 *   iOS Google Maps app registers handlers for `maps://` (and for its own
 *   `comgooglemaps://`). The system app picker presents both when both are
 *   installed. Apple Maps is the default if Google Maps isn't installed —
 *   either way, the user lands in *a* maps app. This matches the industry
 *   pattern (Uber, DoorDash).
 *
 * Why `google.navigation:` on Android?
 *   `geo:` opens the system app picker. For a grant page's "Get Directions"
 *   CTA the user has already chosen the destination — they want navigation
 *   to start, not another picker dialog. `google.navigation:` opens Google
 *   Maps in turn-by-turn navigation directly. For "Open in Maps" (search
 *   mode) `geo:` is correct — it lets the user pick which map to use.
 *
 * Security:
 *   - Every `window.open` includes `noopener,noreferrer`.
 *   - Web URLs go through `encodeURIComponent` for the query parameter.
 *   - Native URLs concatenate the human query directly (URL-encoding the
 *     query for `maps://?q=` is also safe and we apply it).
 *   - Org/address inputs come from the grant DB (admin-curated). Never
 *     from URL parameters or user input.
 */

export interface MapLocation {
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  organization?: string | null;
}

type DeepLinkMode = "search" | "directions";

const NATIVE_FALLBACK_MS = 1500;

/* ── Public API ─────────────────────────────────────────────────────── */

/** Open the location in maps (search view). Prefers native app on mobile. */
export function openInGoogleMaps(loc: MapLocation): void {
  openLocation(loc, "search");
}

/** Open the location in maps (directions view from user's location). */
export function openInGoogleMapsDirections(loc: MapLocation): void {
  openLocation(loc, "directions");
}

/** Whether the location has enough info to plot/open. */
export function hasMapLocation(loc: MapLocation): boolean {
  return buildHumanQuery(loc) !== null;
}

/* ── Core dispatch ──────────────────────────────────────────────────── */

function openLocation(loc: MapLocation, mode: DeepLinkMode): void {
  if (typeof window === "undefined") return;

  const humanQuery = buildHumanQuery(loc);
  if (!humanQuery) return; // No-op when location is empty.

  const webUrl = buildWebUrl(humanQuery, mode);

  if (isMobileUA()) {
    const nativeUrl = buildNativeUrl(humanQuery, mode);
    if (nativeUrl) {
      attemptNativeOpen(nativeUrl, webUrl);
      return;
    }
  }
  // Desktop, or mobile with no platform-specific scheme available.
  openWeb(webUrl);
}

/* ── URL builders ───────────────────────────────────────────────────── */

/**
 * The unencoded "what should the map look up?" string. Used for both
 * native schemes (where some OSes prefer it raw, others encoded) and as
 * the seed for the encoded web URL parameter. Returns null when there is
 * nothing addressable about the location.
 */
function buildHumanQuery(loc: MapLocation): string | null {
  const address = typeof loc.address === "string" ? loc.address.trim() : "";
  if (address) {
    const org = typeof loc.organization === "string" ? loc.organization.trim() : "";
    return org ? `${org}, ${address}` : address;
  }
  const lat = toFiniteNumber(loc.latitude);
  const lng = toFiniteNumber(loc.longitude);
  if (lat !== null && lng !== null) {
    return `${lat},${lng}`;
  }
  return null;
}

function buildWebUrl(humanQuery: string, mode: DeepLinkMode): string {
  const q = encodeURIComponent(humanQuery);
  return mode === "directions"
    ? `https://www.google.com/maps/dir/?api=1&destination=${q}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function buildNativeUrl(humanQuery: string, mode: DeepLinkMode): string | null {
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  if (!isIOS && !isAndroid) return null;

  const q = encodeURIComponent(humanQuery);

  if (isIOS) {
    // Apple Maps + Google Maps app both register `maps://`.
    return mode === "directions" ? `maps://?daddr=${q}` : `maps://?q=${q}`;
  }
  // Android.
  if (mode === "directions") {
    // Open Google Maps directly in turn-by-turn — user has already chosen
    // the destination, no need for the system picker.
    return `google.navigation:q=${q}`;
  }
  // Search mode: `geo:` shows the system app chooser.
  return `geo:0,0?q=${q}`;
}

/* ── Mobile native-launch with web fallback ─────────────────────────── */

function attemptNativeOpen(nativeUrl: string, webFallbackUrl: string): void {
  const fallbackTimer = window.setTimeout(() => {
    cleanup();
    openWeb(webFallbackUrl);
  }, NATIVE_FALLBACK_MS);

  // If the page is hidden (or about to be), the native app has the focus —
  // cancel the fallback so the web URL doesn't open behind it.
  const cancelIfBackgrounded = () => {
    if (document.hidden) {
      window.clearTimeout(fallbackTimer);
      cleanup();
    }
  };
  const cancelOnPagehide = () => {
    window.clearTimeout(fallbackTimer);
    cleanup();
  };

  function cleanup() {
    document.removeEventListener("visibilitychange", cancelIfBackgrounded);
    window.removeEventListener("pagehide", cancelOnPagehide);
  }

  document.addEventListener("visibilitychange", cancelIfBackgrounded);
  window.addEventListener("pagehide", cancelOnPagehide);

  // Trigger the native scheme. We use `location.href = …` (not `window.open`)
  // because Safari blocks `window.open` for non-http schemes outside a click.
  // The current click handler call stack still counts as a user gesture here.
  try {
    window.location.href = nativeUrl;
  } catch {
    // Some browsers throw on unknown schemes — fall through to the timer.
  }
}

function openWeb(url: string): void {
  // `noopener,noreferrer` defends against window.opener tabnabbing.
  window.open(url, "_blank", "noopener,noreferrer");
}

/* ── Predicates / coercion ──────────────────────────────────────────── */

function isMobileUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
}

function toFiniteNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
