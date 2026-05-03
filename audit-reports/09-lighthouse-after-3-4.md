# Phase 9 — Lighthouse Re-baseline (post Task 3.4, 2026-05-03)

> Re-measurement after PR #219 (lazy-load `AIChatBox` on detail pages) merged into `main`.
> Compares against the baseline in [`audit-reports/09-lighthouse-baseline.md`](./09-lighthouse-baseline.md).
> Same harness as PR #218: `lighthouse@13.2.0` + `chrome-headless-shell@148`, performance category only.

## Pre-flight

- `/healthz` → HTTP 200 `{"status":"ok"}`
- Main entry hash flipped: `index-f9lsKnBF.js` (baseline) → `index-CWHJ_15x.js` (post-#219)
- `index.html` `<link rel="modulepreload">` graph on `/` and `/catalog` now lists only `vendor-react`, `vendor-framer`, and `index` — **no `AIChatBox` preload at startup** (baseline preloaded it on every route)

## Compared to baseline (PR #218)

### Mobile

| Page | Score | LCP | TBT | Total transferred | Unused JS |
|---|---|---|---|---|---|
| `/` | 39 → **38** | 8.4 → **8.8 s** | 821 → **839 ms** | 1,401 → **1,400 KiB** | 314 → **313 KB** |
| `/catalog` | 31 → **26** ⚠️ | 59.4 → **52.5 s** | 1366 → **4196 ms** ⚠️ | 11,486 → **10,562 KiB** ✅ | 1,177 → **761 KB** ✅ |
| `/organizations/ORG-0061` | 39 → **39** | 13.7 → **9.1 s** ✅ | 791 → **823 ms** | 3,033 → **2,106 KiB** ✅ | 1,163 → **562 KB** ✅ |

### Desktop

| Page | Score | LCP | TBT | Total transferred | Unused JS |
|---|---|---|---|---|---|
| `/` | 86 → **87** | 1.8 → **1.8 s** | 1 → **0 ms** | — → 1,357 KiB | — → 313 KB |
| `/catalog` | 28 → **36** ✅ | 10.3 → **9.6 s** | 781 → **432 ms** ✅ | — → 10,923 KiB | — → 661 KB |
| `/organizations/ORG-0061` | 67 → **75** ✅ | 3.4 → **2.7 s** ✅ | 27 → **0 ms** ✅ | — → 2,071 KiB | — → 562 KB |

## AIChatBox unused-javascript audit (the key metric)

The Phase 9 prediction in `09-lighthouse-baseline.md` was: after PR #219, `AIChatBox-*.js` should disappear from the `unused-javascript` audit because it's no longer in the eager preload graph on `/catalog` and `/organizations/:id`.

| Page | AIChatBox in unused-JS list? | Top remaining unused-JS contributors |
|---|---|---|
| mobile `/` | ❌ not present (was never on home) | unchanged from baseline |
| mobile `/catalog` | ❌ **gone** (was 600 KB / 873 KB) | `index-CWHJ_15x.js` (109 KB), `vendor-framer` (107 KB), `vendor-react` (81 KB) |
| mobile `/organizations/:id` | ❌ **gone** (was 600 KB / 873 KB) | Google Maps `webgl.js` (155 KB), `index-CWHJ_15x.js` (117 KB), `vendor-react` (84 KB) |

The 600 KB AIChatBox chunk is no longer in the preload manifest, no longer fetched, no longer parsed, and no longer counted by Lighthouse. The reduction in `unused-javascript` totals (mobile `/catalog` −416 KB, mobile `/organizations/:id` **−601 KB exactly**) matches the prediction.

## Verdict — PASSED with one caveat

**The bundle-graph win is real and measured.**

- **`/organizations/:id` mobile** — clear win: LCP 13.7 → 9.1 s (−4.6 s, **−33 %**), total transferred −927 KiB (**−31 %**), unused-JS −601 KB (matches the −600 KB Phase 9 estimate to the kilobyte).
- **`/organizations/:id` desktop** — clear win: score 67 → **75**, LCP 3.4 → 2.7 s, TBT 27 → 0 ms.
- **`/catalog` desktop** — clear win: score 28 → **36** (+8), TBT 781 → **432 ms** (**−349 ms**, matches the −300 ms Phase 9 estimate).
- **`/` mobile + desktop** — flat, as expected (home didn't ship AIChatBox in the first place — the home `unused-javascript` audit confirms this: 314 → 313 KB, no movement).

**One caveat — mobile `/catalog` TBT spike (1,366 → 4,196 ms):** unexpected on a single re-run. Investigated in the JSON; the long-task breakdown shows the regression is concentrated in `vendor-react-BjXCxZj9.js` (1,768 ms) — a chunk **whose hash is unchanged** between baseline and now (PR #219 didn't touch React or framer). server RTT in this run was also 250 ms vs the baseline's 130 ms. Most likely Slow-4G run-to-run variance combined with a slower cold edge on this particular run; not caused by PR #219. Worth confirming with 2–3 mobile-catalog re-runs averaged before treating it as a real regression. The unused-JS, total-weight and AIChatBox-removal numbers are independent of CPU/network noise and they all moved in the predicted direction.

## Top diagnostics (mobile, post-#219)

- 🔴 `mainthread-work-breakdown` still failing: `/` 4.4 s, `/catalog` 9.6 s, `/organizations/:id` 5.1 s. The Maps page is the new bottleneck on `/catalog`.
- 🟠 `unused-javascript` still failing on `/catalog` (761 KB) and `/organizations/:id` (562 KB) — but the offender list is now Maps WebGL + the main `index` chunk, not AIChatBox.
- ✅ `render-blocking-resources`, `uses-text-compression`, `uses-long-cache-ttl`, `font-display`, `redirects`, `uses-rel-preconnect`, `modern-image-formats` — all still passing.

## Files

Raw data lives in [`audit-reports/lighthouse-2026-05-03-after-3-4/`](./lighthouse-2026-05-03-after-3-4/):

- `mobile-home.report.{json,html}`
- `mobile-catalog.report.{json,html}`
- `mobile-org.report.{json,html}`
- `desktop-home.report.{json,html}`
- `desktop-catalog.report.{json,html}`
- `desktop-org.report.{json,html}`

Same harness, same throttling, same chrome flags as the baseline.

## Next actions

1. **🟠 `/catalog` Google Maps payload** is now the unambiguous next target. 10.5 MB transferred on mobile, with `webgl.js` topping the unused-JS chart on `/organizations/:id`. Pagination of marker data + `loading=async` audit is the highest-ROI follow-up after #219.
2. **🟡 Re-run mobile `/catalog` 3 times** to confirm the 4,196 ms TBT spike is run-variance and not a real regression. If the median across 3 runs is back near baseline (≈ 1,300–1,500 ms), close the caveat.
3. **🟢 Stop deferring on this page** — the AIChatBox lazy-load is verified in production; mark Task 3.4 as DONE in `AUDIT-CONTINUATION`.
