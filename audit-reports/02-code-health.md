# Phase 2 — Code Health

**Date:** 2026-05-02
**Scope:** TypeScript strict check, vitest suite, production build, bundle inspection

---

## ✅ TypeScript — clean

```bash
$ pnpm check
> tsc --noEmit
(no output, exit 0)
```

Zero errors across server + client + scripts. ✅

---

## ✅ Tests — 195 / 196 pass, 1 skipped

```
Test Files  14 passed | 1 skipped (15)
     Tests  195 passed | 1 skipped (196)
  Duration  4.94s
```

Coverage by file:
- `auth.logout.test.ts` — 1 ✓
- `admin.test.ts` — 9 ✓
- `emailService.test.ts` — 11 ✓
- `export.test.ts` — 8 ✓
- `grants.test.ts` — 6 ✓
- `paddleWebhook.test.ts` — 16 ✓
- `phase2.test.ts` — 7 ✓
- `subscription.test.ts` — 11 ✓
- `resend-key.test.ts` — 1 skipped (likely needs `RESEND_API_KEY` env)

→ All passing in 4.94s — **healthy test suite, no regressions.**

**Gaps:** no client-side React component tests. Coverage is server-only.

---

## ✅ Build — succeeds in 17s

```
✓ vite build (16.96s)
   dist/index.js   206.6 kB  (server bundle)
   dist/migrate.js 785 B
```

No build errors. Assets emitted to `dist/public/`.

---

## ⚠️ Bundle size — large, but mostly code-split

### Top 10 chunks by size

| Chunk | Size | Notes |
|---|---|---|
| `vendor-csc-*` | **8.72 MB** | `country-state-city` data (intentionally split per `App.tsx:19`) |
| `index-*` | **2.55 MB** | Main entry — large, see below |
| `AIChatBox-*` | 909 KB | AI chat — code-split per route |
| `emacs-lisp-*` | 779 KB | shiki syntax highlighter |
| `cpp-*` | 626 KB | shiki |
| `wasm-*` | 622 KB | shiki / streamdown |
| `cytoscape.esm-*` | 442 KB | likely from streamdown / mermaid |
| `mermaid.core-*` | 433 KB | streamdown markdown rendering |
| `Analytics-*` | 360 KB | route bundle |
| `treemap-*` | 330 KB | mermaid diagram type |

### Initial-load JS estimate

For the home page, only `index-*.js` (2.55 MB) + small dependencies load. **2.55 MB initial JS is heavy** (especially on mobile). Targets:
- Modern web apps aim for < 500 KB initial JS
- Even 1 MB is borderline acceptable

### Notable

- `country-state-city` is correctly excluded from initial bundle (✅ confirmed via `vendor-csc` chunk)
- Markdown / syntax highlighting chunks (mermaid, cytoscape, all those language chunks) are likely from `streamdown` — only loaded on routes that use AIChatBox / GrantDetail rich content
- **No source maps shipped** (`find dist/public -name "*.map"` → 0 matches). ✅ No leakage of original source.

### `index.html` — 369 KB

The HTML itself is unusually large. Likely inlines preloaded JSON or critical CSS. Worth checking `vite.config.ts` for the cause — large initial HTML hurts TTFB.

---

## ⚠️ esbuild warning — direct eval in server entry

```
▲ [WARNING] Using direct eval with a bundler is not recommended

  server/_core/index.ts:94:30:
    94 │ const viteModule = await (eval('import("./vite.js")') as Promise<any>);
```

This is **intentional** — it prevents esbuild from statically resolving `./vite.js` so the dev-only Vite module isn't bundled into production. But:

- Triggers eval-related lint warnings in many tools
- Brittle — if esbuild starts evaluating `eval` strings, the trick breaks
- Better pattern: use a runtime check + `import` from a path resolved via `process.env`, or split into separate entry points (`index.dev.ts` / `index.prod.ts`)

**Severity:** 🟡 Low — works today, but is a code smell.

---

## 🟡 Frozen-file check (cross-reference Phase 3)

`scripts/stage*.cjs` — 9 files, all timestamped `Apr 25 13:45` → never modified. ✅

`client/src/pages/Catalog.tsx` — 5 commits since marked frozen (see Phase 3 report). Either:
- Freeze rule was lifted but `CLAUDE.md` not updated, OR
- Real violation requiring operator review.

---

## ✅ No hardcoded secrets in build artifacts

Spot check via Phase 3's earlier scan (`grep` over server/client/scripts) found no hardcoded credentials. No env values inlined into the client bundle (only `VITE_*` prefixed variables would leak — those are intended public values like `VITE_GOOGLE_MAPS_BROWSER_KEY`).

---

## 📋 Recommendations

| # | Action | Priority |
|---|---|---|
| 1 | Investigate why `index-*.js` is 2.55 MB — likely candidates: bundling all route components instead of dynamic-importing, eager imports of large libs (lucide icons, framer-motion, ...) | 🟠 perf |
| 2 | Investigate why `index.html` is 369 KB | 🟠 perf |
| 3 | Replace `eval('import(...)')` hack with cleaner dev/prod entry split | 🟡 low |
| 4 | Add client-side tests (React Testing Library / Playwright) | 🟡 low |
| 5 | Resolve frozen-file ambiguity for `Catalog.tsx` | 🟡 docs |

---

## What this phase did NOT cover

- gitnexus dead-code analysis — would require `pnpm gitnexus:serve` running
- Performance metrics on prod (LCP, FID, CLS) — blocked by 403, planned for Phase 9
- Coverage report (`vitest run --coverage`) — easy to run later if needed
