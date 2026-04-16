/*
 * LocationMap — single-pin Mapbox map for the GrantDetail page.
 *
 * Design (matches Image 3 in the redesign brief):
 *   - Dark Mapbox style, single teal pin with pulsing ring.
 *   - Popup shows organization + address + "Open in Google Maps" link.
 *   - Bottom-left controls: zoom +, zoom −, locate-me.
 *   - Bottom-right label: "service area: {area}".
 *
 * Performance:
 *   - Map instance lives in a useRef and is *not* torn down on prop changes.
 *   - lat/lng changes use map.setCenter() / marker.setLngLat() — no reinit.
 *   - Container is observed for size changes and resized in place.
 */

import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Crosshair, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { openInGoogleMaps } from "@/lib/googleMaps";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
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
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Stable ref to current address/org so the popup HTML can rebuild without
  // depending on inline closures that would re-run the init effect.
  const popupContentRef = useRef({ organization, address });
  popupContentRef.current = { organization, address };

  // ── Map init (runs once per mount) ──────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !TOKEN) return;

    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container,
      style: STYLE_DARK,
      center: [longitude, latitude],
      zoom: 13,
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "top-right");

    // Custom marker: teal dot + pulsing ring.
    const el = document.createElement("div");
    el.className = "lm-marker";
    el.innerHTML = `
      <div class="lm-marker-pulse"></div>
      <div class="lm-marker-pulse lm-marker-pulse-2"></div>
      <div class="lm-marker-dot"></div>
    `;

    const popupHtml = buildPopupHtml(
      popupContentRef.current.organization,
      popupContentRef.current.address,
      t.map.openInGoogle,
    );
    const popup = new mapboxgl.Popup({
      offset: 18,
      closeButton: true,
      className: "lm-popup",
    }).setHTML(popupHtml);
    popupRef.current = popup;

    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([longitude, latitude])
      .setPopup(popup)
      .addTo(map);
    markerRef.current = marker;

    // Wire up the "Open in Google Maps" link inside the popup.
    popup.on("open", () => {
      const node = popup.getElement()?.querySelector<HTMLAnchorElement>(
        "[data-action='open-google-maps']",
      );
      if (node) {
        const handler = (e: MouseEvent) => {
          e.preventDefault();
          openInGoogleMaps({
            latitude,
            longitude,
            address: popupContentRef.current.address,
            organization: popupContentRef.current.organization,
          });
        };
        node.addEventListener("click", handler);
        // Cleanup is handled implicitly when the popup closes (DOM removed).
      }
    });

    mapRef.current = map;

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      popupRef.current = null;
    };
    // Intentional: latitude/longitude/address/organization changes are handled
    // by the next effect via setCenter/setLngLat — no full reinit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update pin position + popup content when props change (no reinit) ──
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const popup = popupRef.current;
    if (!map || !marker || !popup) return;
    marker.setLngLat([longitude, latitude]);
    map.setCenter([longitude, latitude]);
    popup.setHTML(buildPopupHtml(organization, address, t.map.openInGoogle));
  }, [latitude, longitude, address, organization, t.map.openInGoogle]);

  // ── Controls: zoom +/− and locate-me ───────────────────────────────────
  const zoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const locateMe = useCallback(() => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 13,
          duration: 1200,
        });
      },
      () => {
        // User denied or unavailable — silent. Could surface a toast later.
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  if (!TOKEN) {
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
      {/* Inject scoped marker + popup styles once per page (re-render safe). */}
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
  return `
    <div class="lm-popup-body">
      <div class="lm-popup-org">${safeOrg}</div>
      ${safeAddr ? `<div class="lm-popup-addr">${safeAddr}</div>` : ""}
      <a href="#" data-action="open-google-maps" class="lm-popup-link">↗ ${safeLabel}</a>
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

.mapboxgl-popup.lm-popup .mapboxgl-popup-content {
  background: rgba(15,23,30,0.96);
  border: 1px solid var(--lm-teal);
  border-radius: 8px;
  color: #f4f8fa;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.4;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
  max-width: 240px;
}
.mapboxgl-popup.lm-popup .mapboxgl-popup-tip { border-top-color: var(--lm-teal); }
.mapboxgl-popup.lm-popup .mapboxgl-popup-close-button {
  color: #94a3b8; font-size: 14px; padding: 2px 6px; right: 2px; top: 0;
}
.lm-popup-org  { font-weight: 600; color: #fff; margin-bottom: 2px; }
.lm-popup-addr { color: #cbd5e1; margin-bottom: 6px; }
.lm-popup-link {
  display: inline-block; color: var(--lm-teal); text-decoration: none;
  font-weight: 500;
}
.lm-popup-link:hover { text-decoration: underline; }
`;
