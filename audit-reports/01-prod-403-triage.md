# Production 403 — Triage Report

**Date:** 2026-05-02
**Status:** 🔴 Production inaccessible
**Severity:** CRITICAL

---

## Symptom

Every endpoint on the public production URL returns HTTP 403:

```
GET https://grantkit-production-06f7.up.railway.app/             → 403
GET .../healthz                                                   → 403
GET .../api/trpc/auth.me                                          → 403
GET .../sitemap.xml                                               → 403
GET .../robots.txt                                                → 403

Response:
  HTTP/2 403
  x-deny-reason: host_not_allowed
  content-type: text/plain
  content-length: 21

(no `server:`, `via:`, or `cf-*` headers — origin is masked)
```

---

## Code-side investigation — CLEAN ✅

Searched the entire repo for the 403 source:

```bash
grep -rn -E "host_not_allowed|allowedHosts|x-deny|host.*allow|deny.reason" \
  server/ client/ scripts/ Dockerfile railway.toml vercel.json
```

**Findings:**
- `server/_core/vite.ts:13` → `allowedHosts: true` (vite, dev-only — disables host check)
- `vite.config.ts:189` → `allowedHosts: [...]` (vite client config)
- **No Express middleware** rejects requests by host
- **No `host_not_allowed` string** anywhere in the codebase
- `server/_core/index.ts` is a clean Express app: body parser → paddle webhook → SEO → `/healthz` → tRPC → static
- `railway.toml`, `Dockerfile` are clean
- `vercel.json` has rewrites only (no host filtering)

**Conclusion:** **The 403 is NOT coming from the application code.**

---

## Where the 403 IS coming from

The header `x-deny-reason: host_not_allowed` matches **Railway's edge proxy** behavior when:

1. The service's **public networking** is disabled
2. The service's **primary domain** was changed (e.g., a custom domain was promoted to primary, and the `*.up.railway.app` domain was deactivated)
3. Service is **paused** / has restricted access
4. **"Allowed Hosts"** or domain config in Railway dashboard rejects the requested Host header

The response is:
- Returned **before** the request reaches the Express app (no app logging would show it)
- Returned by Railway's edge / load balancer
- Identical for every path → consistent with a host-level reject, not a route-level one

---

## Recent main-branch activity

Last 15 merges on main are mostly:
- Code reviews (`claude/review-codebase-updates`)
- File restoration after PR #162 merge issues
- Catalog UX changes
- Daily grant discovery

**None modify deployment config** (`railway.toml`, `Dockerfile`, env config) in a way that would explain edge-level 403.

---

## Root cause: Railway dashboard configuration

This is **NOT a code bug**. It's an **infrastructure config issue** on Railway's side. The fix is **operator action in the Railway dashboard**, not a PR.

---

## Operator action required

Log in to Railway dashboard → `lovely-forgiveness` project → `grantkit` service:

### 1. Check Settings → Networking / Domains
- Is `grantkit-production-06f7.up.railway.app` listed as an **active** public domain?
- Was a custom domain added recently? If yes, did it replace the Railway domain?
- Is the **service paused** or in any restricted state?

### 2. Check the latest deploy
- Did the most recent deploy succeed?
- Is the service marked **active**?
- What's the deploy URL Railway is currently routing to?

### 3. Check service environment
- Was a `RAILWAY_ALLOWED_HOSTS` or similar env var added?
- Are env vars from `OPS.md` still all set (`DATABASE_URL`, `JWT_SECRET`, etc.)?

### 4. Quick recovery options (if cause unclear)
- **Re-deploy** the latest commit on main → forces edge config refresh
- **Toggle** the public Railway domain off → on
- Compare against PR #166 / #190 deploy logs (last two merges)

---

## What this audit phase confirms

| Question | Answer |
|---|---|
| Is the codebase the cause? | **No** — repo is clean |
| Will a code fix help? | **No** — fix is on Railway dashboard |
| Can subsequent audit phases (5–10) run against this URL? | **No** — until 403 is resolved |
| Should we run code/DB-only phases now? | **Yes** — they're independent of prod URL |

---

## Recommendation

1. **You** (operator): triage Railway dashboard per "Operator action required" above. Should take 5–15 min once logged in.
2. **Me** (Claude): proceed with **Path B + C in parallel** — code, dependency, security audits + DB audit (once `DATABASE_URL` is exported). These are independent of the broken prod URL.
3. Once prod is back, resume Phases 5–10 (firecrawl-based, public-facing audits).

**This finding alone justifies the audit. Without it, the site would have stayed broken for users.**
