/*
 * DevDeepLinkTest — Phase 6 (Kenji) verification harness.
 *
 * DEV-ONLY page mounted at `/dev/deep-link-test`. Provides hand-runnable
 * test cases for `openInGoogleMaps` / `openInGoogleMapsDirections`,
 * including the four canonical input shapes:
 *
 *   1. Full data    (lat/lng + address + organization)
 *   2. Coords only  (no address, no org)
 *   3. Address only (no coords)
 *   4. Empty        (must no-op — no crash, no navigation)
 *
 * Also surfaces the exact URL string each call would build, so engineers
 * can verify the per-OS native scheme without leaving the page.
 *
 * The route is gated by `import.meta.env.DEV` in App.tsx, so the bundle
 * never ships this code in production.
 */

import { useState } from "react";
import { Link } from "wouter";
import {
  hasMapLocation,
  openInGoogleMaps,
  openInGoogleMapsDirections,
  type MapLocation,
} from "@/lib/googleMaps";

interface TestCase {
  label: string;
  loc: MapLocation;
}

const TEST_CASES: TestCase[] = [
  {
    label: "1. Full data (lat/lng + address + organization)",
    loc: {
      latitude: 35.1541,
      longitude: -90.0410,
      address: "262 Danny Thomas Pl, Memphis, TN 38105",
      organization: "St. Jude Children's Research Hospital",
    },
  },
  {
    label: "2. Coords only (no address, no org)",
    loc: {
      latitude: 40.7589,
      longitude: -73.9851,
    },
  },
  {
    label: "3. Address only (no coords)",
    loc: {
      address: "1600 Pennsylvania Ave NW, Washington, DC 20500",
      organization: "The White House",
    },
  },
  {
    label: "4. Empty (should no-op, no crash)",
    loc: {},
  },
  {
    label: "5. Lat/lng as strings (Drizzle decimal shape)",
    loc: {
      latitude: "37.7749" as any,
      longitude: "-122.4194" as any,
      address: "  ",
      organization: "Coords-as-strings test",
    },
  },
];

export default function DevDeepLinkTest() {
  if (!import.meta.env.DEV) return null;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid;

  return (
    <div className="min-h-screen bg-[#0F1419] text-white p-6 md:p-10 font-mono">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/dev/map-test">
            <button className="text-xs text-white/50 hover:text-white">
              ← /dev/map-test
            </button>
          </Link>
          <h1 className="text-2xl font-bold mt-2">Deep-link test harness</h1>
          <p className="text-sm text-white/60 mt-1">
            Phase 6 (Kenji) verification page. DEV-only. Click each button
            and observe whether the native maps app opens (mobile) or a new
            tab opens (desktop). The expected URLs are shown for sanity.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-xs bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 rounded-md">
            <span className="text-white/50">Detected platform:</span>
            <span className="font-semibold text-[#5DCAA5]">
              {isIOS ? "iOS" : isAndroid ? "Android" : "Desktop / unknown"}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {TEST_CASES.map((tc, i) => (
            <TestCaseRow key={i} testCase={tc} isMobile={isMobile} />
          ))}
        </div>

        <div className="mt-10 p-4 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/65 leading-relaxed">
          <p className="font-semibold text-white/80 mb-2">What to verify:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cases 1–3 + 5 should navigate (or trigger native scheme).</li>
            <li>Case 4 must <strong>no-op</strong> — no navigation, no crash.</li>
            <li>iOS: <code>maps://?q=…</code> (search) or <code>maps://?daddr=…</code> (directions). Apple Maps or GMaps app opens.</li>
            <li>Android: <code>geo:0,0?q=…</code> (search picker) or <code>google.navigation:q=…</code> (GMaps directly).</li>
            <li>Desktop: opens <code>google.com/maps/...</code> in a new tab.</li>
            <li>Web fallback fires after 1500 ms <em>only if</em> the page stays visible (no native app launched).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function TestCaseRow({ testCase, isMobile }: { testCase: TestCase; isMobile: boolean }) {
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const supported = hasMapLocation(testCase.loc);

  const handle = (label: string, fn: () => void) => () => {
    setLastClicked(label);
    fn();
  };

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-sm font-semibold text-white">{testCase.label}</h2>
        <span
          className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
            supported
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-red-500/20 text-red-300"
          }`}
        >
          {supported ? "supported" : "no-op"}
        </span>
      </div>

      <pre className="text-[11px] text-white/65 bg-black/30 p-2 rounded overflow-x-auto mb-3">
        {JSON.stringify(testCase.loc, null, 2)}
      </pre>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handle("openInGoogleMaps", () => openInGoogleMaps(testCase.loc))}
          className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
        >
          openInGoogleMaps
        </button>
        <button
          type="button"
          onClick={handle("openInGoogleMapsDirections", () => openInGoogleMapsDirections(testCase.loc))}
          className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#5DCAA5]/20 hover:bg-[#5DCAA5]/30 text-[#5DCAA5] border border-[#5DCAA5]/30"
        >
          openInGoogleMapsDirections
        </button>
      </div>

      {lastClicked && (
        <p className="mt-2 text-[11px] text-white/50">
          Last invoked:{" "}
          <span className="text-white/75">{lastClicked}</span>
          {!isMobile && supported && (
            <span className="ml-1">→ opened web URL in new tab</span>
          )}
          {isMobile && supported && (
            <span className="ml-1">→ attempted native scheme; web fallback in 1500 ms if page stays visible</span>
          )}
          {!supported && <span className="ml-1 text-red-300">→ correctly no-op'd</span>}
        </p>
      )}
    </div>
  );
}
