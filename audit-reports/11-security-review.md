# Phase 11 — Security Review

**Date:** 2026-05-02
**Scope:** tRPC procedure boundaries, auth flow, error leakage, input validation, XSS/SQL injection vectors, cookie/CSRF posture, rate limiting

---

## 🚨 Critical findings

### 1. `ai.grantChat` is **public** + no rate limit → unbounded LLM cost exposure

**Location:** `server/routers.ts:1328`

```ts
grantChat: publicProcedure
  .input(z.object({
    message: z.string().min(1).max(1000),
    history: z.array(...).max(20).optional(),
  }))
  .mutation(async ({ input }) => {
    const reply = await runGrantChatAssistant(input.message, input.history ?? []);
    return { reply };
  })
```

**Risk:** Any unauthenticated visitor (or bot) can hit `/api/trpc/ai.grantChat` repeatedly. Each call makes a paid Anthropic API request. There is **no rate limiting middleware** in the Express app (`grep -rn rateLimit|helmet server/` returns 0 results).

**Attack pattern:** A simple loop from one IP can drain the project's Anthropic credits in minutes.

**Severity:** 🔴 HIGH (financial)

**Recommendation:**
- Short-term: gate `ai.grantChat` behind `protectedProcedure` (require login). Maintains UX for real users while blocking anonymous abuse.
- Or: add per-IP rate limiting middleware (`express-rate-limit`) before the tRPC handler — at least 5/min/IP.
- Long-term: track per-user request quotas, especially for free-tier users.

---

### 2. tRPC `errorFormatter` leaks SQL queries to clients

**Location:** `server/_core/trpc.ts:31-52`

The custom `errorFormatter` walks the error cause chain and **returns** `causeChain` to the client in the response body:

```ts
return {
  ...shape,
  data: {
    ...shape.data,
    causeChain: extractCauseChain(error.cause ?? error),
  },
};
```

`extractCauseChain` extracts:
- `message` (truncated 500 chars)
- `code`, `errno`, `sqlState`
- `sqlMessage` (truncated 300 chars)
- **`sql` — the actual SQL query string (truncated 300 chars)**

**Risk:**
- Database schema and table names leaked
- Query patterns exposed → helps attackers craft injection probes
- Internal error messages reach the client
- In production this is an information disclosure issue

**Severity:** 🟠 MODERATE (info disclosure)

**Recommendation:**
```ts
errorFormatter({ shape, error }) {
  // log internally as before...
  return {
    ...shape,
    data: {
      ...shape.data,
      // Only expose causeChain in non-production
      ...(process.env.NODE_ENV !== "production" && {
        causeChain: extractCauseChain(error.cause ?? error),
      }),
    },
  };
}
```

---

## ✅ Auth boundary check — looks correct

Procedure-by-procedure walk of `server/routers.ts` (1531 lines):

| Section | Procedure type | Verdict |
|---|---|---|
| `auth.me`, `auth.logout` | public | ✅ correct (logout clears cookie regardless of state) |
| `auth.register / login / forgot / reset / verifyEmail` | public | ✅ correct |
| `subscription.status / cancel / activate` | protected | ✅ correct |
| `grants.savedList / toggleSave` | protected | ✅ correct |
| `catalog.*` (list, detail, count, preview, states, countries, cities, regions, smartSearch) | public | ✅ correct (public catalog browsing) |
| `newsletter.subscribe / unsubscribe` | public | ✅ OK (token-based unsubscribe) |
| `onboarding.*` | protected | ✅ correct |
| `admin.*` (40+ procedures) | admin | ✅ all admin-gated |
| `organizations.*` (list, detail, count, mapPoints, etc.) | public | ✅ correct (public catalog) |
| **`ai.grantChat`** | **public** | 🚨 **WRONG** — see Finding #1 |

`adminProcedure` middleware (`trpc.ts:74-89`) correctly checks `ctx.user.role !== 'admin'` and throws FORBIDDEN. Auth-flow code is sound.

---

## ✅ Input validation — broad coverage (43+ zod schemas)

```bash
grep -nE "\.input\(.*z\.|input:" server/routers.ts | wc -l
# → 43
```

Most procedures use zod schemas. Procedures without `.input()` are mostly bare queries that take no params (e.g. `count`, `states`, `categoryCounts`) — this is correct.

---

## ⚠️ Cookie security — needs review

**Location:** `server/_core/cookies.ts`

```ts
httpOnly: true,            // ✅ correct
sameSite: "none",          // ⚠️ allows cross-origin cookies
secure: isSecureRequest(req),  // conditional — depends on Railway proxy
```

`sameSite: "none"` requires `secure: true` to work in modern browsers, which means `isSecureRequest()` must reliably detect HTTPS via `x-forwarded-proto` (Railway sets this).

**Risk if `isSecureRequest()` is wrong:**
- Cookie won't be set → user can't stay logged in (functional bug)
- Or worse: cookie sent over plain HTTP → leak

**CSRF posture:**
- `sameSite: "none"` → cookie sent on cross-origin requests
- No CSRF tokens visible
- tRPC mutations are POST → preflight needed for non-simple requests
- **For mutations that change state, CSRF protection should be added** if the API is callable from outside the same origin.

**Recommendation:** verify `isSecureRequest()` works correctly behind Railway's proxy (logs would show this). Consider `sameSite: "lax"` if no cross-origin cookie use is needed (frontend + backend are same-origin per CLAUDE.md → `/api/trpc` is relative).

---

## ✅ XSS check — minimal exposure

```bash
grep -rn "dangerouslySetInnerHTML" client/src/
```

→ **1 match**: `client/src/components/ui/chart.tsx:81`

This is the standard shadcn-ui chart component pattern — generates CSS rules from `colorConfig`. The interpolated `id` and color values come from developer code, not user input. **Low risk.** (Verify `id` props aren't user-controlled before deeming fully safe.)

No `eval`, `new Function`, `innerHTML` patterns elsewhere in client/.

---

## ✅ SQL injection check — minimal exposure

`grep -rn "execute_sql|sql\`|raw\(" server/`:

- `server/routers.ts` — uses Drizzle ORM (`db.select()`, `db.insert()`, parameterized) → **safe**
- `server/db.ts` — same
- `server/*.mjs` ad-hoc scripts (enrichment, imports):
  - `enrichGrants.mjs:183, :269` → `db.execute(sql.raw(query))` ⚠️
  - `enrichStateCity.mjs:172` → same
  - `translateGrants.mjs:145` → same

These admin scripts use `sql.raw(query)` where `query` is built locally in the script. They are **operator-only**, not exposed via API. No user input flows in. **Acceptable** — but operator should never paste untrusted data into these scripts.

**Drizzle `sql\`...${var}\`` template literals** elsewhere — these are tagged templates that parameterize variables → **safe**.

---

## 🔍 Missing security middleware

None of these are configured in the Express app (`server/_core/index.ts`):

| Middleware | Status | Recommendation |
|---|---|---|
| `helmet` | ❌ not used | adds `X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options`, etc. |
| `express-rate-limit` | ❌ not used | per-IP rate limiting (esp. for `ai.grantChat`, auth endpoints) |
| `cors` (configured) | ❌ not used | currently relies on same-origin (which is correct for prod) — fine |
| CSRF token (csurf or similar) | ❌ not used | depends on cookie strategy (see above) |

**Recommendation:** add `helmet` + `express-rate-limit` at minimum. ~30 min of work, low risk.

---

## 📋 Action checklist (priority order)

| # | Finding | Effort | Severity |
|---|---|---|---|
| 1 | Gate `ai.grantChat` (protected or per-IP rate-limit) | 15 min | 🔴 HIGH |
| 2 | Hide `causeChain` in production responses | 5 min | 🟠 MOD |
| 3 | Add `helmet` middleware | 15 min | 🟡 LOW |
| 4 | Add `express-rate-limit` for auth + AI routes | 30 min | 🟠 MOD |
| 5 | Verify `isSecureRequest()` works behind Railway | log check | 🟡 LOW |
| 6 | Consider `sameSite: "lax"` if no cross-origin needed | 5 min + test | 🟡 LOW |
| 7 | Add `id` validation in `chart.tsx` if `id` is user-set | 5 min | 🟡 LOW |

---

## What this phase did NOT cover (planned for next runs)

- `/security-review` skill on staged changes — no staged changes to review (all committed)
- Penetration testing of running endpoints — blocked by prod 403
- Dependency CVE remediation plan — covered in Phase 3 (separate report)
- Auth bypass / privilege escalation testing — would need running server
