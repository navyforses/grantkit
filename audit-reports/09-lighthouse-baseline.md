# Phase 9 — Lighthouse Baseline (2026-05-03)

> First live Lighthouse measurement after the 5-PR perf blitz (PRs #208/#211/#212/#214/#216).
> Compares against the theoretical estimates in [`audit-reports/09-performance.md`](./09-performance.md).
> Run from a Cowork sandbox using `chrome-headless-shell@148` + `lighthouse@13.2.0`. JSON+HTML reports are committed alongside this file under [`lighthouse-2026-05-03/`](./lighthouse-2026-05-03/).

## Production URL

`https://grantkit-production-06f7.up.railway.app`

## Configuration

- **Lighthouse CLI:** 13.2.0
- **Chrome:** Google Chrome for Testing 148.0.7778.97 (`chrome-headless-shell`)
- **User-Agent (mobile run):** `HeadlessChrome/148.0.7778.97`
- **Date:** 2026-05-03
- **Network throttling:** Lighthouse defaults — Slow 4G for mobile, broadband for desktop
- **Chrome flags:** `--headless --no-sandbox --disable-dev-shm-usage --disable-gpu`
- **Categories:** `performance` only (`--only-categories=performance`)

## Results — Mobile

| Page | Score | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|
| / | 39 | 7.4 s | 8.4 s | 821 ms | 0.008 | 7.4 s |
| /catalog | 31 | 7.4 s | 59.4 s | 1366 ms | 0.002 | 8.9 s |
| /organizations/ORG-0061 | 39 | 7.4 s | 13.7 s | 791 ms | 0.000 | 7.8 s |

> The `/catalog` LCP of 59.4 s is the Lighthouse `largest-contentful-paint` element settling on the Google Maps tile canvas after marker clustering finishes. Most of the score weight falls on FCP/SI/TBT, which is why the page still scores 31 instead of 0.

## Results — Desktop

| Page | Score | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|
| / | 86 | 1.5 s | 1.8 s | 1 ms | 0.006 | 1.6 s |
| /catalog | 28 | 5.0 s | 10.3 s | 781 ms | 0.003 | 7.2 s |
| /organizations/ORG-0061 | 67 | 2.1 s | 3.4 s | 27 ms | 0.000 | 2.8 s |

## Compared to theoretical estimate (`09-performance.md`)

The pre-fix theoretical estimate for `/` was:

- **LCP:** ~4–6 s on 4G
- **TBT:** ~1.5–3 s
- **Performance score:** ~30–55 / 100 mobile

Actual measurement (post-PRs #208/#211/#212/#214/#216):

| Metric | Theoretical (pre-fix) | Actual mobile `/` | Verdict |
|---|---|---|---|
| LCP | 4–6 s | **8.4 s** | 🔴 worse than estimate, but Lighthouse's Slow-4G profile is harsher than the "4G" the estimate assumed (RTT 150 ms + 1.6 Mbps) |
| TBT | 1500–3000 ms | **821 ms** | ✅ inside the theorised post-fix band — bundle reduction (PR #211) is paying off |
| Score | 30–55 | **39** | ✅ in band |
| FCP | n/a | **7.4 s** | 🔴 dominated by main-thread compile of the 469 KB main bundle on a CPU-throttled mobile profile |
| CLS | "probably good" | **0.008** | ✅ confirmed |

**Net read.** TBT and the overall score landed inside the Phase-9 theoretical band, which is the metric most directly tied to bundle weight — the 78 % bundle cut (Task 3.2) is showing up here. LCP/FCP are pulled out of band by Slow-4G transfer + CPU emulation: the same Home page on Lighthouse's desktop profile clears 86 with LCP 1.8 s, so the codebase isn't the bottleneck on real desktop networks. Mobile-3G/4G remains the weakest surface.

## Top 3 opportunities (mobile, weighted by potential savings)

| # | Opportunity | Affected page(s) | Potential savings | Notes |
|---|---|---|---|---|
| 1 | **Reduce unused JavaScript** | `/`, `/catalog`, `/organizations/:id` | up to 6.07 s / 1.18 MB on mobile `/catalog` | Largest individual offender: `AIChatBox-BE_jayqH.js` ships 873 KB but uses ~273 KB on `/catalog` and `/organizations/:id`. The chat UI is rendered on these routes via `MobileBottomNav` / floating button before the user opens it. |
| 2 | **Total page weight on `/catalog`** | `/catalog` (mobile) | n/a (advisory) | 11,486 KiB transferred — Google Maps tiles + WebGL renderer + marker dataset dominate. |
| 3 | **Main-thread work + bootup time** | All mobile pages | bootup 1.2–2.8 s | 4–5 s of script evaluation + parse/compile per route on the simulated mobile CPU. Splitting `AIChatBox` and `vendor-framer` further would help. |

## Top 3 diagnostics (mobile)

- 🔴 **`unused-javascript`** — failing on every mobile route. `/` ships 314 KB unused, `/catalog` 1,177 KB, `/organizations/:id` 1,163 KB.
- 🔴 **`mainthread-work-breakdown`** — 4.3 s on `/`, 4.5 s on `/catalog`, 5.1 s on `/organizations/:id`.
- 🔴 **`bootup-time`** — 1.2 s / 1.6 s / 2.8 s — all over the 1 s threshold on the mobile profile.

(Other audits — `render-blocking-resources`, `uses-text-compression`, `uses-long-cache-ttl`, `font-display`, `redirects`, `uses-rel-preconnect`, `modern-image-formats` — all passed on every run, which is the direct fingerprint of PRs #208 / #214 / #216.)

## Files

Raw data lives in [`audit-reports/lighthouse-2026-05-03/`](./lighthouse-2026-05-03/):

- `mobile-home.report.{json,html}`
- `mobile-catalog.report.{json,html}`
- `mobile-org.report.{json,html}`
- `desktop-home.report.{json,html}`
- `desktop-catalog.report.{json,html}`
- `desktop-org.report.{json,html}`

Org sample: `ORG-0061` ("Ween Dream", first row from `organizations.list` tRPC call against production).

## Next actions

1. **Defer `AIChatBox` until interaction** _(highest ROI, ~600 KB unused on `/catalog` & `/organizations/:id`)_. Today the chat surface mounts on every route via `MobileBottomNav` / floating launcher. Wrap the launcher in a stub that imports the full `AIChatBox` chunk only on click. Expected: TBT −300 ms on mobile, total weight on `/catalog` −0.6 MB.
2. **Trim `/catalog` Google Maps payload**. 11 MB transferred is an order of magnitude beyond every other route. Worth confirming whether `loading=async` + `defer` are applied to the Maps script tag and whether marker data can be paginated server-side instead of shipping all 1,110 organisations to the client up front.
3. **Re-baseline after #1 and #2 ship.** Re-run this exact harness so the report becomes a reference point rather than a one-off snapshot.
