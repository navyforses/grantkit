# GrantKit Site Audit — Executive Summary

**Date:** 2026-05-02
**Branch:** `claude/add-mcp-servers-6tRzu` → PR #194
**Phases completed:** 0, A (prod triage), 2, 3, 11
**Phases pending:** 4 (DB), 5–10 (firecrawl public-facing — blocked on prod 403)

---

## 🚨 Top-priority issues — fix in this order

| # | Issue | Severity | Effort | Owner |
|---|---|---|---|---|
| 1 | **Production returns HTTP 403 to all requests** | 🔴 CRITICAL | 5–15 min | Operator (Railway dashboard) |
| 2 | **`ai.grantChat` is publicProcedure — no rate limit, no auth** → unbounded Anthropic API spend | 🔴 HIGH | 15 min | Code fix |
| 3 | **tRPC `errorFormatter` leaks SQL queries to clients** in production | 🟠 MOD | 5 min | Code fix |
| 4 | **`@anthropic-ai/sdk` 0.88 has CVE-2026-41686** (insecure file perms) | 🟠 MOD | 5 min | `pnpm update` |
| 5 | **`pnpm` runtime 10.4.1 (per `packageManager` field) has CVE-2025-69262** (RCE via env) — `pnpm add -D pnpm@latest` is **not enough**; must update `package.json` `packageManager` and pin the workflow's `pnpm/action-setup` `version` | 🟠 HIGH | 10 min | `corepack use pnpm@10.33.2` + workflow pin |
| 6 | **`xlsx` package — 2 unpatched HIGH CVEs**, project moved off npm | 🟠 HIGH | 1–2 hr | Migrate to `exceljs` |
| 7 | **`Catalog.tsx` freeze rule** — listed as DO-NOT-TOUCH but 5 commits since | 🟡 LOW | 5 min | Update CLAUDE.md/PROJECT_MAP.md |

---

## 📊 Summary by phase

| Phase | Scope | Status | Headline result |
|---|---|---|---|
| **0** | Setup + smoke test | ✅ done | audit-reports/ created; firecrawl ✓; **prod 403 detected** |
| **A** | Prod 403 triage | ✅ done | **Not a code bug** — Railway edge / dashboard config |
| **2** | TypeScript / tests / build | ✅ done | All green: 0 TS errors, 195/196 tests pass, build OK |
| **3** | Dependencies + CVEs | ✅ done | **56 vulns** (1 critical, 19 high, 35 mod, 1 low) |
| **11** | Security review | ✅ done | Auth boundaries sound, but `ai.grantChat` + SQL leakage need fixes |
| **4** | DB content | ⏳ blocked | needs `DATABASE_URL` exported from operator |
| **5–10** | Public-facing (firecrawl) | ⏳ blocked | needs prod 200 OK |

---

## ✅ What's healthy

- TypeScript: 0 errors
- Tests: 14 files / 195 passing / 1 skipped, no failures
- Production build: succeeds in ~17s, no source maps shipped
- `.env` / hardcoded secrets: **none found** in code
- Auth boundary: `adminProcedure` / `protectedProcedure` / `publicProcedure` correctly applied to ~95% of routes
- Code splitting: `country-state-city` (8.7 MB) correctly split off main bundle
- Cookie posture: `httpOnly: true`, `secure: isSecureRequest(req)` ✅

---

## ⚠️ What's not great (but not urgent)

- **Bundle size** — main `index-*.js` is 2.55 MB, `index.html` is 369 KB. Initial JS exceeds typical performance budgets. Worth profiling.
- **No client-side test coverage** — only server tests exist
- **No `helmet`, no `express-rate-limit`** — recommended additions, ~30 min work
- **`server/_core/index.ts:94` uses `eval('import(...)')`** — intentional dev-only-bundle hack, but a code smell
- **`sameSite: "none"`** cookie — works for cross-origin, but if frontend+backend are same-origin (per CLAUDE.md), `sameSite: "lax"` is safer

---

## 🚧 What this audit could not test

These need either prod fixed or `DATABASE_URL` provided:

- ✗ Real-world request flow (blocked: 403)
- ✗ SEO meta tags / Open Graph / hreflang on live site
- ✗ Lighthouse scores (LCP, CLS, FID)
- ✗ Accessibility on rendered pages
- ✗ Broken external links across catalog
- ✗ DB integrity (orphan rows, stale grants, NULL counts, dup detection)
- ✗ Translation coverage in DB (UI strings already 100% — DB content not audited)

---

## 🎯 Recommended next steps (in priority order)

1. **Operator** — fix Railway 403 (dashboard config). Reports phase 0 + A explain how.
2. **Tier-1 security fix PR** — `ai.grantChat` gating + `causeChain` prod-gate + `@anthropic-ai/sdk` + `pnpm` upgrades. ~30 min as a single small PR.
3. **`xlsx` → `exceljs` migration PR** — separate, larger refactor.
4. **Resume audit Phase 4** in a fresh session once `DATABASE_URL` is exported.
5. **Resume audit Phases 5–10** in a fresh session once prod returns 200.
6. **Doc cleanup** — reconcile `Catalog.tsx` freeze rule with reality (either un-freeze in CLAUDE.md/PROJECT_MAP.md, or revert recent commits).

---

## 📁 Reports in this PR

- `00-phase0-prep.md` — setup, smoke test, blocker triage
- `01-prod-403-triage.md` — 403 root-cause investigation
- `02-code-health.md` — typecheck, tests, build, bundle analysis
- `03-deps-security.md` — CVE inventory, outdated package list
- `11-security-review.md` — tRPC procedure boundaries, auth, XSS/SQL/CSRF posture
- `SUMMARY.md` — this file
