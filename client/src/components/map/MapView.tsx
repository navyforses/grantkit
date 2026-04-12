/*
 * MapView — Full-screen interactive Mapbox GL world map
 * Supports dark/light theme switching via MutationObserver on <html>.dark
 * Requires VITE_MAPBOX_TOKEN environment variable.
 */

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
export const LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";

const getIsDark = () => document.documentElement.classList.contains("dark");
const getStyle = () => (getIsDark() ? DARK_STYLE : LIGHT_STYLE);

interface MapViewProps {
  className?: string;
  /** Called once the map has loaded and is ready */
  onMapReady?: (map: mapboxgl.Map) => void;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

export default function MapView({ className = "", onMapReady, ariaLabel = "Interactive grant map" }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !TOKEN) return;

    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container,
      style: getStyle(),
      center: [20, 0],
      zoom: 1.8,
      minZoom: 1,
      maxZoom: 20,
      // Keep the map 2D — no tilt or rotation
      dragRotate: false,
      touchPitch: false,
      // Hide default attribution control (we add our own compact one)
      attributionControl: false,
    });

    // Disable compass/rotation while keeping touch zoom
    map.touchZoomRotate.disableRotation();

    // Zoom +/- controls in bottom-right (no compass)
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "bottom-right"
    );

    // Attribution text (compact) — required by Mapbox ToS; logo hidden via CSS
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    mapRef.current = map;

    // Resize map when the container's bounding box changes
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    // Notify parent when map finishes loading
    map.once("load", () => onMapReady?.(map));

    // Switch Mapbox style when the user toggles light/dark
    let prevDark = getIsDark();
    const mutationObserver = new MutationObserver(() => {
      const nowDark = getIsDark();
      if (nowDark !== prevDark) {
        prevDark = nowDark;
        map.setStyle(nowDark ? DARK_STYLE : LIGHT_STYLE);
      }
    });
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // onMapReady intentionally excluded — we only want to register it once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No token — show a friendly setup message instead of crashing
  if (!TOKEN) {
    return (
      <div
        className={`flex items-center justify-center bg-secondary ${className}`}
      >
        <div className="text-center p-8 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-4.724A1 1 0 013 14.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V9.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 7"
              />
            </svg>
          </div>
          <h3 className="text-foreground font-semibold mb-2">
            Map token required
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Set{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
              VITE_MAPBOX_TOKEN
            </code>{" "}
            in your{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
              .env
            </code>{" "}
            file to enable the interactive world map.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} role="region" aria-label={ariaLabel} />;
}
