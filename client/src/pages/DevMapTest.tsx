/*
 * DevMapTest — internal verification page for Phase 3.
 * Mounted only when import.meta.env.DEV is true (see App.tsx).
 *
 * Renders LocationMap with hard-coded coordinates and MapPanel with a
 * synthetic 50-grant set so the maps can be visually verified without
 * relying on the production DB or geocoded data.
 *
 * Safe to delete after visual sign-off in Phase 8.
 */

import { useMemo, useState } from "react";
import LocationMap from "@/components/LocationMap";
import MapPanel, { type MapPanelGrant } from "@/components/MapPanel";

const SAMPLE_LOCATION = {
  latitude: 40.7589,
  longitude: -73.9851,
  address: "1 Times Square, New York, NY 10036",
  organization: "Sample Foundation HQ",
  serviceArea: "USA nationwide",
};

// Generate 60 fake grants spread over the US to stress clustering.
function makeSampleGrants(n: number): MapPanelGrant[] {
  const seeds: Array<[number, number, string]> = [
    [40.7589, -73.9851, "NYC"],
    [34.0522, -118.2437, "LA"],
    [41.8781, -87.6298, "Chicago"],
    [29.7604, -95.3698, "Houston"],
    [33.4484, -112.0740, "Phoenix"],
    [39.9526, -75.1652, "Philly"],
    [32.7157, -117.1611, "San Diego"],
    [47.6062, -122.3321, "Seattle"],
    [25.7617, -80.1918, "Miami"],
    [42.3601, -71.0589, "Boston"],
  ];
  const out: MapPanelGrant[] = [];
  for (let i = 0; i < n; i++) {
    const [lat, lng, label] = seeds[i % seeds.length];
    out.push({
      id: `dev-grant-${i}`,
      latitude: lat + (Math.random() - 0.5) * 0.4,
      longitude: lng + (Math.random() - 0.5) * 0.4,
      name: `${label} Sample Grant #${i}`,
    });
  }
  return out;
}

export default function DevMapTest() {
  const grants = useMemo(() => makeSampleGrants(60), []);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Phase 3 — Map Components</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dev-only verification page. Not linked from the navigation. Remove after sign-off.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">LocationMap (single pin, GrantDetail)</h2>
        <div className="max-w-2xl">
          <LocationMap {...SAMPLE_LOCATION} height={320} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          MapPanel ({grants.length} grants, clustered)
        </h2>
        <div className="text-sm text-muted-foreground mb-2">
          Hovered: <code>{highlightedId ?? "—"}</code> · Last click:{" "}
          <code>{clickedId ?? "—"}</code>
        </div>
        <div className="h-[480px] border border-border rounded-xl overflow-hidden">
          <MapPanel
            grants={grants}
            highlightedId={highlightedId}
            onHover={setHighlightedId}
            onMarkerClick={(g) => setClickedId(g.id)}
          />
        </div>
      </section>
    </div>
  );
}
