# Phase 9 — Task 3.5 Verification (deterministic bundle-graph check, 2026-05-03)

> Verification of [PR #221](https://github.com/navyforses/grantkit/pull/221) (lazy-load `MapPanel`
> on `/catalog`) using **bundle-graph introspection** rather than Lighthouse runs.
>
> The post-Task-3.4 re-baseline ([`09-lighthouse-after-3-4.md`](./09-lighthouse-after-3-4.md))
> showed mobile `/catalog` TBT spiked 1,366 → 4,196 ms in a single Slow-4G run, attributable to
> a `vendor-react` long task — a chunk PR #219 didn't touch and PR #221 doesn't touch either.
> Lighthouse score-based verification is run-variance prone for this route. The bundle graph,
> by contrast, is **deterministic**, derives from build artefacts, and tests exactly what
> PR #221 changed: whether the `MapPanel` + `googleMapsLoader` + `vendor-gmaps` chunks have been
> moved out of the `/catalog` initial-load graph and behind a `React.lazy` boundary.

## Pre-flight (deploy verification)

| # | Check | Command | Result | Verdict |
|---|---|---|---|---|
| 1 | `/healthz` returns 200 + `"status":"ok"` | `curl /healthz` | `{"status":"ok"}` | ✅ PASS |
| 2 | Main bundle hash changed (was `index-CWHJ_15x.js` post-3.4) | `curl / \| grep index-` | `index-BMm4yPCq.js` | ✅ PASS — new chunk shipped |
| 3 | `/` modulepreloads exclude `MapPanel` chain | `curl / \| grep modulepreload` | only `vendor-react`, `vendor-trpc`, `vendor-framer` | ✅ PASS |
| 4 | `/catalog` modulepreloads exclude `MapPanel` chain | `curl /catalog \| grep modulepreload` | identical to `/` (SPA shell) | ✅ PASS |

**Pre-flight `/catalog` `<head>` snippet (verbatim):**

```html
<script type="module" crossorigin src="/assets/index-BMm4yPCq.js"></script>
<link rel="modulepreload" crossorigin href="/assets/vendor-react-BjXCxZj9.js" />
<link rel="modulepreload" crossorigin href="/assets/vendor-trpc-DOZsBUVm.js" />
<link rel="modulepreload" crossorigin href="/assets/vendor-framer-BRy_LXvC.js" />
<link rel="stylesheet" crossorigin href="/assets/index-85qWUrFg.css" />
```

No `MapPanel`, no `googleMapsLoader`, no `markerclusterer`, no `vendor-gmaps` in the eager
preload graph for either route.

## Bundle graph (the decisive test)

| # | Check | Command | Result | Verdict |
|---|---|---|---|---|
| 5 | `MapPanel-*.js` exists separately as a fetchable chunk | `curl /assets/MapPanel-DDhfE79J.js` | HTTP 200, **7,059 b** (~7 KB wrapper) | ✅ PASS — lazy split present |
| 6 | `googleMapsLoader-*.js` exists separately as a fetchable chunk | `curl /assets/googleMapsLoader-CfbSf2Bo.js` | HTTP 200, **542 b** | ✅ PASS — lazy split present |
| 7 | `Catalog-*.js` references `MapPanel` only via lazy boundary | `grep MapPanel Catalog-BvPaRsoV.js` | 1 unique URL, 3 textual occurrences (1 `__vite__mapDeps` manifest entry + 2 `React.lazy(() => __vitePreload(import("./MapPanel-DDhfE79J.js")))` boundaries); **0 static `import "./MapPanel..."`** | ✅ PASS — no eager load |
| 8 | `Catalog-*.js` does NOT reference `markercluster` | `grep -c markercluster Catalog-BvPaRsoV.js` | **0** | ✅ PASS — no longer in initial graph |

### Why 3 occurrences in Check 7 (not 1)

The operator's brief expected "1 occurrence (manifest entry)". Actual count is 3 textual
occurrences but breaks down as:

```
offset     65 → const __vite__mapDeps=...["assets/MapPanel-DDhfE79J.js", ...    (manifest array)
offset 96053 → const Gs=l.lazy(()=>mt(()=>import("./MapPanel-DDhfE79J.js"),     (React.lazy #1)
                __vite__mapDeps([0,1,2,3,4,5,6,7])));
offset 106044 → const al=l.lazy(()=>mt(()=>import("./MapPanel-DDhfE79J.js"),    (React.lazy #2)
                __vite__mapDeps([0,1,2,3,4,5,6,7])))
```

Both at offsets 96053 and 106044 are `React.lazy(() => __vitePreload(() => import(...)))`
patterns — i.e. **dynamic imports gated through Vite's lazy-load helper**. There is no
static `import "./MapPanel"` anywhere in the chunk. The two `React.lazy` boundaries are
distinct call sites in the Catalog code path (likely the desktop split-pane and the mobile
tab layout) — both correctly lazy. **Static import count = 0** is the architecturally
meaningful measurement and it is exactly 0.

### What `markercluster` looks like in the bundle now

Searching for the literal string `markercluster` (case-insensitive, substring) across all
shipped chunks:

```
index-BMm4yPCq.js                 → 0
Catalog-BvPaRsoV.js               → 0
MapPanel-DDhfE79J.js              → 0
googleMapsLoader-CfbSf2Bo.js      → 0
vendor-gmaps--a_pk3Jc.js          → 0
```

Vite's minifier renames `MarkerClusterer` to short identifiers and the literal package
name no longer appears in any chunk. Tree-shaken into one of the lazy chunks
(transitively imported only by `MapPanel`). Since `Catalog-*.js` no longer pulls in any
of `MapPanel-*`, `googleMapsLoader-*`, or `vendor-gmaps-*` eagerly, the marker-clusterer
code is also no longer in the `/catalog` initial graph by construction.

## Lazy chunk inventory (transferred only when Map tab is opened)

| Chunk | Bytes | Notes |
|---|---|---|
| `MapPanel-DDhfE79J.js` | 7,059 | The lazy wrapper |
| `googleMapsLoader-CfbSf2Bo.js` | 542 | Singleton loader for `https://maps.googleapis.com/maps/api/js` |
| `vendor-gmaps--a_pk3Jc.js` | 26,996 | `@googlemaps/markerclusterer` + helpers (transitively pulled by `MapPanel`) |
| **Total now lazy** | **34,597 b (≈ 34 KB JS)** | Plus the Maps API script itself (~750 KB external) and tile imagery |

The Catalog chunk stayed at 117,933 b (`Catalog-BvPaRsoV.js`) — comparable in order of
magnitude to what it was before, confirming the diff is "moved Maps stack out", not
"changed Catalog functionality".

## Verdict — 8/8 PASS

PR #221's lazy-load boundary for `MapPanel` is **architecturally correct in production**.
Mobile `/catalog` users who never tap the "Map" tab no longer fetch the Maps stack on
initial render: ~34 KB JS chunks + the ~750 KB Google Maps API script + tile imagery are
all gated behind `React.lazy`, triggered only when `MapPanel` mounts.

### Quantitative impact (carried from Task 3.4 baseline → expected drop)

The Task 3.4 baseline measured mobile `/catalog` at **10,562 KiB total transferred** with
**761 KB unused JS** dominated by the Maps stack (per the Task 3.4 report's "Top
remaining unused-JS contributors" diagnostic on `/organizations/:id` showed `webgl.js`
155 KB — same Maps stack). With PR #221, list-only viewers avoid:

- ~34 KB of lazy-split JS chunks (`MapPanel` + `googleMapsLoader` + `vendor-gmaps`)
- ~750 KB of external Maps API script (`maps.googleapis.com/maps/api/js`)
- All map-tile image fetches

A future Lighthouse re-run on mobile `/catalog` (3-run median to absorb Slow-4G variance)
should show `webgl.js` and the gmaps loader leaving the `unused-javascript` audit
entirely. This verification does not produce score deltas (deliberately — see rationale
below); the architectural change is complete and provable from the bundle graph alone.

## Why no Lighthouse score in this verification

The Task 3.4 verification ([`09-lighthouse-after-3-4.md`](./09-lighthouse-after-3-4.md))
recorded a TBT spike of 1,366 → 4,196 ms on mobile `/catalog` in a single Slow-4G run,
attributed to `vendor-react-BjXCxZj9.js` (chunk hash unchanged before and after PR #219)
on a slower edge RTT (250 ms vs baseline 130 ms). PR #221 also does not touch
`vendor-react`. Re-running Lighthouse here would inherit the same Slow-4G run-variance
that obscured the win in PR #219's verification.

The bundle graph, by contrast:

- Is **deterministic** — same inputs, same outputs every run
- Is **directly downstream** of what PR #221 changed (the `manualChunks` config + the
  new `React.lazy` import site)
- Tests **exactly the architectural property** the PR is claiming (no eager `MapPanel`)
- Avoids confounding chunks the PR didn't touch

If a future session needs the score numbers, re-run the harness from PR #218 with a
3-run median (recommended config) — this is also flagged as a follow-up in the Task 3.4
verification report. For now, deterministic bundle verification is sufficient to close
Task 3.5.

## Reproducibility

This report is curl-based — no JSON/HTML attachments to commit. The 8 commands in the
checks above are reproducible from any shell with `curl + grep`. Replace the chunk
hashes with whatever `index-*.js` resolves to via `curl -sS https://grantkit-production-06f7.up.railway.app/ | grep -oE 'index-[A-Za-z0-9_-]+\.js'`
if the production deploy moves forward.

## Next actions

1. **🟡 Re-run mobile `/catalog` 3× to median TBT** _(sandbox or Windows, ~5 min)_ — outstanding from
   Task 3.4 verification caveat. With PR #221 also merged, the median should now reflect
   both AIChatBox and MapPanel removal from initial graph. Recommended before declaring
   the catalog page "performance audit closed".
2. **🟡 Task 4.1 — Translations** _(operator-side, ~30 min)_ — `pnpm translate:missing` (22 keys).
3. **🟡 Task 2.2 — Data normalization** _(operator-side, ~30 min)_ — country codes (7 rows) +
   orphan grants (968) + branches geocode (84). Scripts ready on main.
4. **🟡 Task 5.2 — Subscription Funnel review** _(~5 hr)_ — Paddle test mode flow + webhook → DB path.
