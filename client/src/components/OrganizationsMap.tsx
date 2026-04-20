/*
 * OrganizationsMap — Google Maps with clustered HQ/Branch markers.
 *
 * Differentiates two kinds of points by color:
 *   HQ     → #1F4E78 (deep blue)
 *   Branch → #22C55E (green)
 *
 * Marker clustering kicks in at 50+ points via @googlemaps/markerclusterer
 * (SuperClusterAlgorithm). Click on a marker fires `onMarkerClick` with
 * the full point payload — parent is responsible for InfoWindow rendering.
 */

import { useEffect, useRef, useState } from "react";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import type { Marker } from "@googlemaps/markerclusterer";
import { cn } from "@/lib/utils";
import {
  GOOGLE_MAP_ID,
  googleMapsReady,
  loadMapsAndMarker,
} from "@/lib/googleMapsLoader";

export interface OrgMapPoint {
  branchId: string;
  orgId: string;
  name: string;
  branchType: "HQ" | "Branch";
  latitude: number;
  longitude: number;
}

interface OrganizationsMapProps {
  points: OrgMapPoint[];
  onMarkerClick?: (point: OrgMapPoint) => void;
  onBoundsChange?: (bounds: {
    swLat: number; swLng: number; neLat: number; neLng: number;
  }) => void;
  boundsDebounceMs?: number;
  className?: string;
  emptyText?: string;
  errorText?: string;
  ariaLabel?: string;
}

const HQ_COLOR = "#1F4E78";
const BRANCH_COLOR = "#22C55E";

const getIsDark = () => document.documentElement.classList.contains("dark");

export default function OrganizationsMap({
  points,
  onMarkerClick,
  onBoundsChange,
  boundsDebounceMs = 400,
  className,
  emptyText = "No locations to display.",
  errorText = "Map unavailable",
  ariaLabel = "Organization locations map",
}: OrganizationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(
    new Map(),
  );
  const markerLibRef = useRef<google.maps.MarkerLibrary | null>(null);
  const pointsRef = useRef<OrgMapPoint[]>(points);
  pointsRef.current = points;

  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const fittedOnceRef = useRef(false);

  // ── Map init ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !googleMapsReady) {
      if (!googleMapsReady) setLoadError(true);
      return;
    }

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let boundsTimer: number | null = null;
    let initialDark = getIsDark();

    loadMapsAndMarker()
      .then(({ maps, marker }) => {
        if (disposed || !containerRef.current) return;

        const map = new maps.Map(containerRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          mapId: GOOGLE_MAP_ID,
          colorScheme: (initialDark ? "DARK" : "LIGHT") as google.maps.ColorScheme,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
        });
        mapRef.current = map;
        markerLibRef.current = marker;

        const clusterer = new MarkerClusterer({
          map,
          algorithm: new SuperClusterAlgorithm({ radius: 80, maxZoom: 14 }),
          renderer: {
            render: ({ count, position }) => {
              const el = document.createElement("div");
              el.className = "orgmap-cluster";
              const size = count < 10 ? 36 : count < 50 ? 50 : 64;
              el.style.width = `${size}px`;
              el.style.height = `${size}px`;
              el.textContent = String(count);
              return new marker.AdvancedMarkerElement({
                position,
                content: el,
                zIndex: 1000 + count,
              });
            },
          },
        });
        clustererRef.current = clusterer;

        themeObserver = new MutationObserver(() => {
          const nowDark = getIsDark();
          if (nowDark !== initialDark) {
            initialDark = nowDark;
            setEpoch((n) => n + 1);
          }
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });

        resizeObserver = new ResizeObserver(() => {
          google.maps.event.trigger(map, "resize");
        });
        resizeObserver.observe(container);

        // Debounced bounds change event
        const idleListener = map.addListener("idle", () => {
          if (!onBoundsChangeRef.current) return;
          if (boundsTimer !== null) window.clearTimeout(boundsTimer);
          boundsTimer = window.setTimeout(() => {
            const b = map.getBounds();
            if (!b) return;
            const sw = b.getSouthWest();
            const ne = b.getNorthEast();
            onBoundsChangeRef.current?.({
              swLat: sw.lat(), swLng: sw.lng(), neLat: ne.lat(), neLng: ne.lng(),
            });
          }, boundsDebounceMs);
        });

        setReady(true);

        // Clean up idle listener on dispose
        (map as any).__idleListener = idleListener;
      })
      .catch((err) => {
        if (disposed) return;
        console.error("OrganizationsMap: Google Maps load failed", err);
        setLoadError(true);
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      if (boundsTimer !== null) window.clearTimeout(boundsTimer);
      const idleListener = mapRef.current && (mapRef.current as any).__idleListener;
      if (idleListener) google.maps.event.removeListener(idleListener);
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
      markersRef.current.clear();
      markerLibRef.current = null;
      mapRef.current = null;
      fittedOnceRef.current = false;
      setReady(false);
    };
  }, [epoch, boundsDebounceMs]);

  // ── Sync markers ──
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    const lib = markerLibRef.current;
    if (!map || !clusterer || !lib) return;

    const prev = markersRef.current;
    const next = new Map<string, google.maps.marker.AdvancedMarkerElement>();
    const toAdd: google.maps.marker.AdvancedMarkerElement[] = [];
    const toRemove: google.maps.marker.AdvancedMarkerElement[] = [];
    const keepIds = new Set<string>();

    for (const p of points) {
      if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) continue;
      keepIds.add(p.branchId);
      const existing = prev.get(p.branchId);
      if (existing) {
        existing.position = { lat: p.latitude, lng: p.longitude };
        next.set(p.branchId, existing);
      } else {
        const el = buildPinContent(p.branchType);
        const m = new lib.AdvancedMarkerElement({
          position: { lat: p.latitude, lng: p.longitude },
          content: el,
          gmpClickable: true,
          zIndex: p.branchType === "HQ" ? 50 : 10,
        });
        m.addListener("gmp-click", () => {
          const found = pointsRef.current.find((pp) => pp.branchId === p.branchId);
          if (found) onMarkerClickRef.current?.(found);
        });
        next.set(p.branchId, m);
        toAdd.push(m);
      }
    }

    for (const [id, m] of Array.from(prev.entries())) {
      if (!keepIds.has(id)) {
        m.map = null;
        toRemove.push(m);
      }
    }

    if (toRemove.length) clusterer.removeMarkers(toRemove as Marker[]);
    if (toAdd.length) clusterer.addMarkers(toAdd as Marker[]);

    markersRef.current = next;
  }, [points, ready]);

  // ── Initial fit-to-bounds (once on first non-empty load) ──
  useEffect(() => {
    if (!ready || fittedOnceRef.current) return;
    const map = mapRef.current;
    if (!map) return;
    const valid = points.filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    );
    if (valid.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of valid) bounds.extend({ lat: p.latitude, lng: p.longitude });
    if (valid.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(11);
    } else {
      map.fitBounds(bounds, 48);
    }
    fittedOnceRef.current = true;
  }, [points, ready]);

  if (loadError || !googleMapsReady) {
    return (
      <div
        className={cn(
          "w-full h-full rounded-xl bg-secondary text-muted-foreground text-xs flex items-center justify-center",
          className,
        )}
      >
        {errorText}
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-secondary", className)}>
      <style>{ORGMAP_CSS}</style>
      <div
        ref={containerRef}
        className="absolute inset-0"
        role="application"
        aria-label={ariaLabel}
      />
      {ready && points.length === 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 text-muted-foreground text-xs px-3 py-1.5 rounded-full shadow pointer-events-none">
          {emptyText}
        </div>
      )}
    </div>
  );
}

function buildPinContent(branchType: "HQ" | "Branch"): HTMLElement {
  const el = document.createElement("div");
  el.className = `orgmap-pin ${branchType === "HQ" ? "orgmap-pin-hq" : "orgmap-pin-branch"}`;
  return el;
}

const ORGMAP_CSS = `
:root {
  --orgmap-hq: ${HQ_COLOR};
  --orgmap-branch: ${BRANCH_COLOR};
}
.orgmap-pin {
  width: 14px;
  height: 14px;
  border: 2px solid #ffffff;
  border-radius: 9999px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.3);
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform 120ms ease-out;
}
.orgmap-pin:hover {
  transform: translate(-50%, -50%) scale(1.3);
}
.orgmap-pin-hq {
  width: 18px;
  height: 18px;
  background: var(--orgmap-hq);
}
.orgmap-pin-branch {
  background: var(--orgmap-branch);
}
.orgmap-cluster {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--orgmap-hq);
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.92;
  cursor: pointer;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.orgmap-cluster:hover { opacity: 1; }
.gm-style * { outline: none; }
`;
