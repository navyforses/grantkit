# Phase 10 — Bundle Analysis

> Generated: 2026-05-03
> Source: local `pnpm build` against current main (post PR #206)

## Top 15 chunks

| Chunk | Size | Source | Loaded |
|---|---|---|---|
| `vendor-csc-*.js` | **8.72 MB** | `country-state-city` data | ✅ split, lazy |
| **`index-*.js`** | **2.55 MB** | main entry — see analysis below | ⚠️ always loaded |
| `AIChatBox-*.js` | 909 KB | AI chat | ✅ route-split |
| `emacs-lisp-*.js` | 779 KB | shiki / streamdown syntax | on-demand |
| `cpp-*.js` | 626 KB | shiki | on-demand |
| `wasm-*.js` | 622 KB | shiki | on-demand |
| `cytoscape.esm-*.js` | 442 KB | streamdown / mermaid | on-demand |
| `mermaid.core-*.js` | 433 KB | streamdown markdown diagrams | on-demand |
| `Analytics-*.js` | 360 KB | `/analytics` route | route-split |
| `treemap-*.js` | 330 KB | mermaid diagram type | on-demand |
| `wolfram-*.js` | 262 KB | shiki | on-demand |
| `index-*.css` | 229 KB | Tailwind | ⚠️ always loaded |
| `vue-vine-*.js` | 190 KB | shiki | on-demand |
| `angular-ts-*.js` | 184 KB | shiki | on-demand |
| `typescript-*.js` | 181 KB | shiki | on-demand |

Total: **442 chunks** in `dist/public/assets/`.

## ⚠️ Critical issues

### 1. `index.html` is 369 KB (should be < 5 KB)

**Cause:** `vite-plugin-manus-runtime` (line 153 of `vite.config.ts`) is included in the plugins array **unconditionally** — it injects a 200+ KB inline `<script>` block into production HTML. This script handles in-browser visual editing / debugging — a dev tool, not for end users.

**Impact:** Every page load downloads 369 KB of HTML before any JS even starts. TTFB (time-to-first-byte) is artificially inflated by ~100 ms on slow connections. The inline script also blocks parsing.

**Fix:**
```ts
// vite.config.ts:153
const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  ...(process.env.NODE_ENV === "production"
    ? []
    : [vitePluginManusRuntime(), vitePluginManusDebugCollector()]),
];
```

Or move both plugins to a dev-only config block. Estimated effect: **index.html drops from 369 KB → ~5 KB.**

### 2. Main `index-*.js` is 2.55 MB (target < 500 KB)

This is the entry chunk — loaded on every page before anything else. 2.55 MB initial JS is **5× over typical SPA budget**. Vite's own warning flagged it.

To diagnose, run `vite-bundle-visualizer` (or `rollup-plugin-visualizer`) once locally. Likely culprits, in order of probability:

1. **Eager imports in `App.tsx` or `main.tsx`** — components that should be lazy-loaded via `React.lazy(() => import(...))`. Per PROJECT_MAP.md, `App.tsx` already lazy-loads heavy pages (Catalog, Analytics, etc.) — but probably not all of them.
2. **Lucide icons imported as `import { Foo, Bar, Baz } from "lucide-react"`** — if any non-tree-shaken usage exists, the entire icon set is pulled in.
3. **Framer Motion / Radix UI** — large UI libs that should be aggressively code-split per route.
4. **Recharts** — appears in catalog admin views; if imported eagerly, adds ~120 KB.
5. **Vendor `index.css` of 229 KB** — possibly Tailwind isn't tree-shaking unused classes (check `content` config).

**Suggested next step:** add `rollup-plugin-visualizer`:
```bash
pnpm add -D rollup-plugin-visualizer
```
```ts
import { visualizer } from "rollup-plugin-visualizer";
// in build.rollupOptions.plugins:
visualizer({ filename: "dist/stats.html", gzipSize: true, brotliSize: true })
```
Then `pnpm build` produces `dist/stats.html` — opens in any browser, treemap of every byte.

### 3. Streamdown + shiki language chunks (~5 MB total)

Files like `emacs-lisp-*.js` (779 KB), `cpp-*.js` (626 KB), `wasm-*.js`, `wolfram-*.js`, `vue-vine-*.js`, etc. are syntax highlighters from `shiki` (transitively via `streamdown` for markdown rendering in AI chat).

**Status:** ✅ correctly route-split — only loaded when AI chat / GrantDetail rich content renders code blocks in those specific languages.

**Optimization opportunity:** AI chat output is mostly English prose. If 95% of responses don't include code, all those language chunks waste cache. Consider:
- Restricting shiki to a smaller language set (default to `plaintext`, `js`, `ts`, `python`, `bash`)
- Or removing streamdown's syntax highlighting entirely if not user-facing

Estimated savings: 3–4 MB of (dormant but downloadable) cache.

## ✅ What's good

- `country-state-city` (8.7 MB) **correctly split** to `vendor-csc-*.js` — never loaded on home page
- Per-route splitting works — `Catalog`, `Analytics`, `AIChatBox`, etc. are separate chunks
- No source maps shipped (`find dist/public -name "*.map"` → 0 matches)
- Total **442 chunks** indicates aggressive splitting is the design intent
- Vendor chunks separated (`vendor-react`, `vendor-framer`, `vendor-trpc`)

## Recommendations (priority order)

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | Gate `vitePluginManusRuntime` on `NODE_ENV !== production` | 2 min | -360 KB HTML |
| 2 | Add `rollup-plugin-visualizer`, profile `index-*.js` | 30 min | identifies what to lazy-load |
| 3 | Lazy-load remaining heavy pages from `App.tsx` (Onboarding, AiAssistant, Profile, Admin) | 1 hr | -800 KB to -1.5 MB initial JS |
| 4 | Audit Lucide icon imports — switch to `lucide-react/icons/specific` style | 30 min | -100 to -300 KB |
| 5 | Trim shiki languages or disable syntax highlighting in AI chat | 1 hr | cleaner cache |
| 6 | Verify Tailwind `content` paths don't over-include — `index.css` 229 KB is borderline high | 15 min | -50 to -100 KB CSS |

## Why Phase 9 (Performance / Lighthouse) couldn't run

Production at `grantkit-production-06f7.up.railway.app` is reachable from a normal browser, but the cloud sandbox running this audit is blocked from its proxy. Lighthouse-style metrics (LCP, FID/INP, CLS) need to be measured against the live URL from a real network.

**Operator action to unblock Phase 9:**
1. Open Chrome DevTools → Lighthouse tab → Run on `https://grantkit-production-06f7.up.railway.app/`
2. Run separately on `/catalog` and `/organizations/<sample-id>` (heaviest routes)
3. Save the JSON reports and paste their summaries (LCP / CLS / TBT / TTI numbers)
4. I'll annotate against the bundle findings above

The bundle findings already explain *why* Lighthouse will score poorly: **2.55 MB initial JS is the dominant cost.**
