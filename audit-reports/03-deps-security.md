# Phase 3 — Dependencies & Security Audit

**Date:** 2026-05-02
**Scope:** `pnpm audit`, `pnpm outdated`, hardcoded secret scan, frozen-file integrity

---

## 🔴 Vulnerability summary

| Severity | Count |
|---|---|
| Critical | **1** |
| High | **19** |
| Moderate | **35** |
| Low | 1 |
| **Total** | **56** |

Total dependencies: 1,206

---

## 🚨 High-priority vulnerabilities

### Direct dependencies (in `package.json`)

| Package | Current | Patched | Severity | Issue |
|---|---|---|---|---|
| `@anthropic-ai/sdk` | `^0.88.0` | `0.91.1+` | moderate | CVE-2026-41686 — insecure file permissions in `BetaLocalFilesystemMemoryTool` (world-readable memory files) |
| `pnpm` (runtime) | `10.4.1` (via `packageManager`) | `10.27.0+` | high | CVE-2025-69262 — RCE via env var substitution in `.npmrc` `tokenHelper`. **The `devDependencies.pnpm` entry (`10.18.1`) is cosmetic — Corepack uses the `packageManager` field**. The CI workflow `daily-discovery.yml` also calls `pnpm/action-setup@v4` with no `version:` input, so it inherits the same pin. Both must be updated. |
| `xlsx` | `^0.18.5` | **none** | high × 2 | Prototype Pollution + ReDoS. **The `xlsx` project moved off npm** — no patched npm version exists. Migration to alternative (`exceljs`, `node-xlsx`) recommended. |
| `vite` | `^7.1.7` | `7.x` patches | high × 2, mod × 4 | fs.deny bypass, path traversal, arbitrary file read via WS, `.map` path traversal |
| `express` | `^4.21.2` | `5.x` | high (transitive: `path-to-regexp`) | ReDoS in route param handling |
| `lodash`, `lodash-es` | (transitive) | upgrade | high | code injection via `_.template` imports |
| `recharts` | `^2.15.2` | (uses old DOMPurify?) | mod | brings in vulnerable `dompurify` transitively |

### Transitive (notable)

- `tar` / `node-tar` — multiple high (path traversal, symlink poisoning) — usually pulled by build tools
- `picomatch` — high (ReDoS in extglob)
- `rollup` — high (arbitrary file write)
- `dompurify` — moderate (XSS via mutation, USE_PROFILES prototype pollution)
- `qs` — DoS via memory exhaustion (Express 4 dep)

---

## 📦 Outdated packages — major version bumps

Sorted by impact:

| Package | Wanted | Latest | Upgrade type |
|---|---|---|---|
| `typescript` | `5.9.3` | `6.0.3` | **MAJOR** — breaking changes |
| `vitest` | `2.1.9` | `4.1.5` | MAJOR (×2) |
| `vite` | `7.1.9` | `8.0.10` | MAJOR — fixes vite CVEs above |
| `express` | `4.21.2` | `5.2.1` | MAJOR — fixes path-to-regexp |
| `@types/express` | `4.17.21` | `5.0.6` | MAJOR (paired w/ express 5) |
| `superjson` | `1.13.3` | `2.2.6` | MAJOR — needed for trpc 11? check |
| `lucide-react` | `0.453.0` | `1.14.0` | MAJOR — large API gap |
| `streamdown` | `1.4.0` | `2.5.0` | MAJOR |
| `@googlemaps/js-api-loader` | `1.16.10` | `2.0.2` | MAJOR |
| `react-resizable-panels` | `3.0.6` | `4.10.0` | MAJOR |
| `recharts` | `2.15.4` | `3.8.1` | MAJOR |
| `cross-env` | `7.0.3` | `10.1.0` | MAJOR |
| `@vitejs/plugin-react` | `5.0.4` | `6.0.1` | MAJOR (paired w/ vite 8) |
| `@anthropic-ai/sdk` | `0.88.0` | `0.92.0` | minor — **fixes CVE** |
| `pnpm` | `10.18.1` | `10.33.2` | patch — **fixes CVE** |
| `drizzle-orm` | `0.44.7` | `0.45.2` | minor |
| `mysql2` | `3.20.0` | `3.22.3` | minor |
| `framer-motion` | `12.23.22` | `12.38.0` | minor |
| `jose` | `6.1.0` | `6.2.3` | minor |
| `react-hook-form` | `7.64.0` | `7.75.0` | minor |
| `zod` | `4.1.12` | `4.4.2` | minor |
| `@types/node` | `24.7.0` | `25.6.0` | MAJOR |
| `tailwindcss` | `4.1.14` | `4.2.4` | minor |
| `tsx` | `4.20.6` | `4.21.0` | patch |
| `prettier` | `3.6.2` | `3.8.3` | minor |
| `esbuild` | `0.25.10` | `0.28.0` | minor |
| `gitnexus` | `1.5.3` | `1.6.3` | minor |

---

## ✅ Hardcoded secrets check — CLEAN

```bash
grep -rn -E "(api[_-]?key|secret|password|token|bearer)\s*[:=]\s*['\"][a-zA-Z0-9]{16,}" \
  server/ client/ scripts/ | grep -v "process.env\|ENV\."
```

→ **No matches**. All secrets are routed through `server/_core/env.ts` `ENV` object. ✅

---

## ⚠️ Frozen-file integrity — VIOLATION FOUND

`CLAUDE.md` lists `client/src/pages/Catalog.tsx` as **frozen** (DO NOT TOUCH). But:

```
git log --oneline -5 -- client/src/pages/Catalog.tsx
db015bf feat(catalog-list): widen sidebar, surface meaningful category + email
c3d2421 fix(catalog): hydrate selected map item with full org row + correct type
80ad73a fix(catalog): city filter sources from branches, fixes EU dropdown
7e33321 fix(catalog-map): cluster centroid drift + tighter filter zoom
0ab729b feat(catalog): remove redundant split view mode
```

→ **5 recent commits** have modified the frozen file. Either:
- The freeze policy was intentionally lifted (then `CLAUDE.md` should be updated)
- Or the policy was violated (operator review needed)

`scripts/stage*.cjs` — also marked frozen — exist with original 2026-04-25 timestamps. ✅ untouched.

`PROJECT_MAP.md` — `/catalog` is also marked 🚫 FROZEN. Same commits affect it.

**Action:** Decide which is true and update `CLAUDE.md` / `PROJECT_MAP.md` to match reality. Stale docs of this kind cause future agents to either:
(a) refuse legitimate work, or
(b) ignore the freeze list entirely.

---

## 🎯 Recommended remediation order

### Tier 1 — Quick security patches (low risk, high value)

```bash
pnpm update @anthropic-ai/sdk@latest        # → 0.92.x, fixes CVE-2026-41686
```

For pnpm CVE-2025-69262, `pnpm add -D pnpm@latest` is **not enough** — it only updates a cosmetic devDependency entry. The actual runtime pnpm version is controlled by:

1. **`package.json` `packageManager` field** (line 166) — currently pinned to `pnpm@10.4.1`, which is in the vulnerable range. Corepack uses this value, ignoring `devDependencies.pnpm`.
2. **`.github/workflows/daily-discovery.yml`** — `pnpm/action-setup@v4` is used **without a `version:` input**, so it falls back to the `packageManager` value (also vulnerable).

**Correct remediation:**
```jsonc
// package.json
"packageManager": "pnpm@10.33.2+sha512.<new hash>"  // or any 10.27.0+
```

Update steps:
1. `corepack use pnpm@10.33.2` (rewrites `packageManager` with a fresh integrity hash)
2. Verify locally: `pnpm --version` reports the new version
3. Either trust `packageManager` for CI (already does), or pin explicitly in the workflow:
   ```yaml
   - uses: pnpm/action-setup@v4
     with:
       version: 10.33.2
   ```

~10 min work, no breaking changes expected.

### Tier 2 — Vite security patches (within vite 7.x, then v8)
- Try `pnpm update vite@^7` first (within-major patch)
- If patches don't cover all CVEs → vite 8 upgrade (review breaking changes)

### Tier 3 — Express 4 → 5 migration
- Fixes path-to-regexp ReDoS (CVE-2024-45296)
- Breaking: middleware ordering, async error handling, removed body-parser, etc.
- Plan carefully — touches server entry point + every middleware
- Pair with `@types/express@5` upgrade
- Estimated: 1–2 days work + thorough testing

### Tier 4 — `xlsx` migration (no upstream patch)
- Either move to **`exceljs`** (already in devDependencies!) or **`node-xlsx`**
- Search usage in `server/importGrants.ts` and any admin import flows
- Replace, test, drop `xlsx` dependency
- Eliminates 2 high-severity CVEs

### Tier 5 — Major framework upgrades (deferred)
- TypeScript 6, Vitest 4, Lucide 1.x, etc.
- Each needs its own PR + smoke tests
- Don't bundle with security fixes

---

## What this phase did NOT cover

- Code health (`pnpm check`, `pnpm test`, `pnpm build`) — **blocked, `node_modules` was missing in this sandbox**. Triggered `pnpm install --frozen-lockfile` in background; will run in Phase 2 once it completes.
- gitnexus dead-code analysis — needs `pnpm gitnexus:serve` running
- GitHub Dependabot alerts comparison (cross-check via github MCP) — TODO

---

## Next phases blocked / unblocked

| Phase | Status |
|---|---|
| 2 (code health) | ⏳ waiting on `pnpm install` |
| 4 (DB content) | 🔴 blocked — needs `DATABASE_URL` |
| 11 (security review skill) | ✅ unblocked, can run on current changes |
