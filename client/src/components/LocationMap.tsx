/*
 * LocationMap — single-pin Google Map for the GrantDetail page.
 *
 * Design (matches Image 3 in the redesign brief):
 *   - Dark vector map, single teal pin with pulsing ring.
 *   - InfoWindow shows organization + address + "Open in Google Maps" link.
 *   - Bottom-left controls: zoom +, zoom −, locate-me.
 *   - Bottom-right label: "service area: {area}".
 *
 * Lifecycle:
 *   - Map instance lives in a useRef and is *not* torn down on prop changes.
 *   - lat/lng/address/organization changes update the marker + info window
 *     in place — no re-init.
 *   - Container is observed for size changes and resized in place.
 *
 * Dependencies:
 *   - @googlemaps/js-api-loader (singleton via lib/googleMapsLoader)
 *   - VITE_GOOGLE_MAPS_BROWSER_KEY + VITE_GOOGLE_MAPS_MAP_ID env vars
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { openInGoogleMaps } from "@/lib/googleMaps";
import {
  GOOGLE_MAP_ID,
  googleMapsReady,
  loadMapsAndMarker,
} from "@/lib/googleMapsLoader";

const TEAL = "#1D9E75";

interface LocationMapProps {
  latitude: number;
  longitude: number;
  address: string;
  organization: string;
  serviceArea?: string;
  height?: number;
  className?: string;
}

export default function LocationMap({
  latitude,
  longitude,
  address,
  organization,
  serviceArea,
  height = 280,
  className,
}: LocationMapProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);

  // Keep popup content reactive without re-running the init effect.
  const popupContentRef = useRef({ organization, address });
  popupContentRef.current = { organization, address };

  const [loadError, setLoadError] = useState(false);

  // ── Map init (once per mount) ──────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !googleMapsReady) {
      if (!googleMapsReady) setLoadError(true);
      return;
    }

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    loadMapsAndMarker()
      .then(({ maps, marker }) => {
        if (disposed || !containerRef.current) return;

        const map = new maps.Map(containerRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 13,
          mapId: GOOGLE_MAP_ID,
          colorScheme: "DARK" as google.maps.ColorScheme,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          keyboardShortcuts: false,
        });
        mapRef.current = map;

        // Custom DOM pin: teal dot + two pulsing rings.
        const pinEl = document.createElement("div");
        pinEl.className = "lm-marker";
        pinEl.innerHTML = `
          <div class="lm-marker-pulse"></div>
          <div class="lm-marker-pulse lm-marker-pulse-2"></div>
          <div class="lm-marker-dot"></div>
        `;

        const advMarker = new marker.AdvancedMarkerElement({
          map,
          position: { lat: latitude, lng: longitude },
          content: pinEl,
        });
        markerRef.current = advMarker;

        const info = new maps.InfoWindow({
          content: buildPopupHtml(
            popupContentRef.current.organization,
            popupContentRef.current.address,
            t.map.openInGoogle,
          ),
        });
        infoRef.current = info;

        // Pin click → open InfoWindow.
        advMarker.addListener("gmp-click", () => {
          info.open({ map, anchor: advMarker });
        });

        // Wire up "Open in Google Maps" after the info window DOM is inserted.
        info.addListener("domready", () => {
          const root = document.querySelector(
            ".gm-style .gm-style-iw .lm-popup-body",
          );
          const link = root?.querySelector<HTMLAnchorElement>(
            "[data-action='open-google-maps']",
          );
          if (!link) return;
          const handler = (e: MouseEvent) => {
            e.preventDefault();
            openInGoogleMaps({
              latitude,
              longitude,
              address: popupContentRef.current.address,
              organization: popupContentRef.current.organization,
            });
          };
          link.addEventListener("click", handler, { once: true });
        });

        // Resize map when container dimensions change (split-view, zoom, rotate).
        // NB: `event` and other static helpers live on the global `google.maps`
        // namespace (populated as a side effect of importLibrary), not on the
        // MapsLibrary return value which only exposes constructors.
        resizeObserver = new ResizeObserver(() => {
          google.maps.event.trigger(map, "resize");
        });
        resizeObserver.observe(container);
      })
      .catch((err) => {
        if (disposed) return;
        // eslint-disable-next-line no-console
        console.error("LocationMap: Google Maps load failed", err);
        setLoadError(true);
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      infoRef.current?.close();
      infoRef.current = null;
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
      mapRef.current = null;
    };
    // Map init runs once. Prop changes are handled by the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update pin position + popup content when props change (no reinit) ──
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const info = infoRef.current;
    if (!map || !marker || !info) return;
    const pos = { lat: latitude, lng: longitude };
    marker.position = pos;
    map.setCenter(pos);
    info.setContent(buildPopupHtml(organization, address, t.map.openInGoogle));
  }, [latitude, longitude, address, organization, t.map.openInGoogle]);

  // ── Controls ──────────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom((map.getZoom() ?? 13) + 1);
  }, []);
  const zoomOut = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom((map.getZoom() ?? 13) - 1);
  }, []);
  const locateMe = useCallback(() => {
    const map = mapRef.current;
    if (!navigator.geolocation || !map) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        map.setZoom(13);
      },
      () => {
        // User denied or unavailable — silent.
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  if (loadError || !googleMapsReady) {
    return (
      <div
        style={{ height }}
        className={cn(
          "w-full rounded-xl bg-secondary text-muted-foreground text-xs flex items-center justify-center",
          className,
        )}
      >
        {t.map.error}
      </div>
    );
  }

  return (
    <div
      style={{ height }}
      className={cn(
        "relative w-full rounded-xl overflow-hidden border border-border bg-secondary",
        className,
      )}
    >
      {/* Scoped marker + popup styles injected once per render; idempotent. */}
      <style>{LOCATION_MAP_CSS}</style>

      <div
        ref={containerRef}
        className="absolute inset-0"
        role="region"
        aria-label={`${organization} ${t.map.locateMe}`}
      />

      {/* Bottom-left control stack */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={zoomIn}
          aria-label={t.map.zoomIn}
          title={t.map.zoomIn}
          className="w-8 h-8 rounded-md bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          aria-label={t.map.zoomOut}
          title={t.map.zoomOut}
          className="w-8 h-8 rounded-md bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={locateMe}
          aria-label={t.map.locateMe}
          title={t.map.locateMe}
          className="w-8 h-8 rounded-md bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom-right service-area label */}
      {serviceArea && (
        <div className="absolute bottom-3 right-3 z-10 text-[11px] font-medium text-[color:var(--lm-teal-muted)] bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md max-w-[60%] truncate">
          {t.map.serviceArea.replace("{area}", serviceArea)}
        </div>
      )}
    </div>
  );
}

function buildPopupHtml(organization: string, address: string, openLabel: string): string {
  const safeOrg = escapeHtml(organization || "");
  const safeAddr = escapeHtml(address || "");
  const safeLabel = escapeHtml(openLabel);
  // The popup link is rendered inside Google's InfoWindow DOM, outside our
  // React tree. We bake aria-label + rel attrs into the HTML directly so
  // screen readers announce the destination + new-tab behaviour.
  const ariaLabel = escapeHtml(`${openLabel} — ${organization || address}`);
  return `
    <div class="lm-popup-body">
      <div class="lm-popup-org">${safeOrg}</div>
      ${safeAddr ? `<div class="lm-popup-addr">${safeAddr}</div>` : ""}
      <a href="#"
         data-action="open-google-maps"
         class="lm-popup-link"
         role="button"
         aria-label="${ariaLabel}"
         rel="noopener noreferrer"
      >↗ ${safeLabel}</a>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const LOCATION_MAP_CSS = `
:root { --lm-teal: ${TEAL}; --lm-teal-muted: rgba(29,158,117,0.85); }

.lm-marker {
  position: relative;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
}
.lm-marker-dot {
  position: absolute;
  inset: 0;
  background: var(--lm-teal);
  border: 2px solid #fff;
  border-radius: 9999px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
}
.lm-marker-pulse {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  background: var(--lm-teal);
  opacity: 0.45;
  animation: lm-pulse 1.8s ease-out infinite;
}
.lm-marker-pulse-2 { animation-delay: 0.9s; }
@keyframes lm-pulse {
  0%   { transform: scale(1);   opacity: 0.45; }
  80%  { transform: scale(2.6); opacity: 0;    }
  100% { transform: scale(2.6); opacity: 0;    }
}

/* Google InfoWindow body styling (scoped via our wrapper class). */
.gm-style .gm-style-iw-c:has(.lm-popup-body) {
  background: rgba(15,23,30,0.96) !important;
  border: 1px solid var(--lm-teal);
  border-radius: 8px !important;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4) !important;
  padding: 0 !important;
}
.gm-style .gm-style-iw-c:has(.lm-popup-body) .gm-style-iw-d {
  overflow: hidden !important;
}
.gm-style .gm-style-iw-tc:has(+ div .lm-popup-body)::after {
  background: rgba(15,23,30,0.96) !important;
}
.lm-popup-body {
  color: #f4f8fa;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.4;
  max-width: 240px;
}
.lm-popup-org  { font-weight: 600; color: #fff; margin-bottom: 2px; }
.lm-popup-addr { color: #cbd5e1; margin-bottom: 6px; }
.lm-popup-link {
  display: inline-block; color: var(--lm-teal); text-decoration: none;
  font-weight: 500;
}
.lm-popup-link:hover { text-decoration: underline; }
`;
