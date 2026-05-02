# Phase 0 — Preparation & Smoke Test

**Date:** 2026-05-02
**Branch:** `claude/add-mcp-servers-6tRzu`

---

## Setup checklist

| Item | Status | Notes |
|---|---|---|
| `audit-reports/` folder created | ✅ | `/home/user/grantkit/audit-reports/` |
| firecrawl MCP | ✅ Connected | (re-connected mid-session) |
| context7 MCP | ⚠️ Configured, health check fails | likely needs OAuth on first invoke — non-blocking |
| github MCP (custom HTTP) | ⚠️ Configured, health check fails | duplicate of platform MCP — **recommended remove** |
| github MCP (platform) | ✅ Connected | scope: `navyforses/grantkit` only |
| `grantkit-db` MCP | ❌ Not started | requires `DATABASE_URL` (see blocker B1) |
| `gitnexus` MCP | ❌ Not started | requires running `pnpm gitnexus:serve` |
| Production smoke test | 🚨 **FAILED** | see blocker B2 |

---

## 🚨 Blockers found

### B1 — `DATABASE_URL` not available in this shell

- No `.env` file in repo root (`.env.example` exists)
- No `DATABASE_URL` in shell env
- `pnpm toolbox:start` will exit immediately
- **Phases blocked:** 4 (DB content audit), parts of 10 (sourceUrl verification)

**Resolution options (per `.grantkit-redesign/OPS.md`):**
1. Operator exports `MYSQL_PUBLIC_URL` from Railway dashboard:
   ```bash
   export DATABASE_URL="<MYSQL_PUBLIC_URL from Railway>"
   ```
2. Or create `.env` file with `DATABASE_URL=...` (gitignored)

---

### B2 — Production returns HTTP 403 on ALL endpoints 🔥

```
GET https://grantkit-production-06f7.up.railway.app/        → 403
GET .../healthz                                              → 403
GET .../api/trpc/auth.me                                     → 403

Response headers:
  HTTP/2 403
  x-deny-reason: host_not_allowed
  content-type: text/plain
```

**Analysis:**
- `x-deny-reason: host_not_allowed` is NOT a standard Railway/Cloudflare header
- Tested with alternate `Host: grantkit.org` → still 403
- `server/_core/vite.ts` has `allowedHosts: true` (vite host check disabled — this is dev-mode anyway)
- The 403 is being returned by something between Railway's edge and the Express app
- **Possible causes:**
  - Custom host-allowlist middleware deployed but misconfigured
  - Railway service has been put behind an access policy
  - A new deployment broke host validation
  - DNS/domain config drift

**Severity:** 🔴 **CRITICAL — production is currently inaccessible to the public**

This is a **show-stopper** for Phases 5–10 (all firecrawl-based audits), and likely the most urgent issue this audit will surface.

**Suggested triage before continuing audit:**
1. Check Railway deployment logs for the latest deploy (PR #190 merge per HEAD)
2. Check if a host allowlist was added in recent commits
3. Verify the production service is actually serving the latest build
4. Test a fresh deployment

---

### B3 — firecrawl MCP intermittent

System reminders showed firecrawl disconnecting once mid-session, then re-connecting. Health check now: ✓ Connected. Worth monitoring during long phases (esp. Phase 10 with 200-page crawl).

---

## ✅ Confirmed working

| Tool | Use case |
|---|---|
| `firecrawl_*` (16 tools) | Phases 5–10 (sitemap, SEO, a11y, perf, content) — **but production is 403** so cannot test prod URL |
| platform `mcp__github__*` | Phases 1, 3, 11 (CI status, PR/issue search, secret scan, file ops) |
| `Read` / `Bash` / `Edit` | All phases |
| `pnpm` scripts (`check`, `test`, `build`, `translate:audit`) | Phase 2, 4, 7 |

---

## Recommendation

**Stop the planned phase order. Triage B2 (production 403) first.**

The audit was scoped to a "live, deployed product." With production returning 403 to everything, Phases 5–10 are meaningless against the deployed URL. Two paths:

### Path A — Fix prod first, then full audit (recommended)
1. Investigate the 403 source (next 30–60 min)
2. Deploy fix
3. Verify `/healthz` returns 200
4. Resume Phase 1

### Path B — Run code/DB-only audit on local
1. Skip Phases 5–10 (or run against `pnpm dev` localhost)
2. Run Phases 2, 3, 4, 11 on the codebase (no prod dependency)
3. Treat B2 as the primary finding, all else secondary

---

## Next step needed from operator

Choose one:
- **(A)** Investigate 403 first — I can grep recent commits for host-allowlist code and check Railway logs via github MCP
- **(B)** Proceed with code-only phases (2, 3, 4, 11), skip prod-dependent ones
- **(C)** Provide `DATABASE_URL` (export in shell) so Phase 4 unblocks regardless
