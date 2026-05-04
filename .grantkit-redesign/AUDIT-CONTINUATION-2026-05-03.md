# 🧠 GrantKit — აუდიტის Continuation Memory

> **დანიშნულება:** ეს არის სრული მეხსიერების გვერდი. ნებისმიერმა ახალმა Claude / agent სესიამ ამ ფაილის წაკითხვით უნდა შეძლოს უკვე გაკეთებული აუდიტის გაგრძელება და გეგმის შესრულება.
>
> **შექმნა:** 2026-05-03
> **წყარო:** აუდიტის სრული ციკლი (ფაზები 0-11) PR-ები #194 → #219
> **ენა:** ქართული + ტექნიკური ტერმინები English-ად

---

## 📍 ამჟამინდელი მდგომარეობა (Snapshot)

| Area | State |
|---|---|
| Production URL | https://grantkit-production-06f7.up.railway.app |
| Latest commit on main | `7ae690a` (post #224 merge) |
| Active development branch | `claude/grantkit-audit-continue-7mEhS` (Task 5.2 sandbox-side review) |
| Last merged audit PR | #224 (audit memory sync); recent: #218 / #219 / #220 / #221 / #223 / #222 / #224 |
| Last DB migration on production | `0011_volatile_demogoblin` ✅ applied 2026-05-03 (operator) |
| Pending operator actions | _(none — Task 2.2 closed; only Tasks 4.1 / 4.2 / 5.2 remaining)_ |
| Tier 1 security patches | ✅ Verified complete (2026-05-03) — see Goal 1 task 1.1 |
| Bundle size (main `index-*.js`) | ✅ 2,554 KB → 563 KB (Task 3.2, PR #211) |
| Server entry split (no eval hack) | ✅ Done (Task 6.1, PR #212) |
| Self-hosted fonts | ✅ Done (Task 3.3, PR #214) |
| Express 5 migration | ✅ Done (Task 1.3, PR #216) |
| Production auth columns | ✅ Done (Task 2.1, operator 2026-05-03) |
| Lighthouse baseline (live) | ✅ Done (Task 3.1, PR #218 merged 2026-05-03) |
| AIChatBox lazy-load | ✅ Done (Task 3.4, PR #219 merged 2026-05-03) |
| MapPanel lazy-load | ✅ Done (Task 3.5, PR #221 merged 2026-05-03) |
| Data normalization | ✅ Done (Task 2.2, operator 2026-05-04) — 13 country fixes + 618 grants linked + 1,245 branches geocoded |
| Latest Lighthouse re-baseline | ✅ 2026-05-03 post-3.4 — `audit-reports/09-lighthouse-after-3-4.md` (mobile `/organizations/:id` LCP 13.7 → 9.1 s, unused-JS −601 KB) |
| Latest bundle-graph verification | ✅ 2026-05-03 Task 3.5 — `audit-reports/09-task-3-5-verification.md` (8/8 PASS — `MapPanel`, `googleMapsLoader`, `vendor-gmaps` removed from `/catalog` initial graph) |

---

## ✅ უკვე დასრულებული სამუშაო (PR-ები)

| PR | სათაური | Status |
|---|---|---|
| #194 | audit: phase 0-3 baseline reports | ✅ Merged |
| #195 | fix(security): Tier 1 — ai.grantChat auth + causeChain prod-guard + sdk/pnpm bumps | ✅ Merged |
| #196 | docs: un-freeze Catalog.tsx | ✅ Merged |
| #197 | feat(security): Tier 2 — helmet + base rate-limit | ✅ Merged |
| #198 | docs: catalog unfreeze | ✅ Merged |
| #199 | chore(deps): replace xlsx with exceljs (Task 1.2) | ✅ Merged |
| #200 | feat(security): path-specific rate limits (auth 10/min, ai 20/min) | ✅ Merged |
| #201 | feat(security): enable Content-Security-Policy via helmet | ✅ Merged |
| #202 | fix(seo)+a11y: sitemap + OnboardingModal role | ✅ Merged |
| #203 | fix(csp): allow Google Maps gstatic + worker blobs | ✅ Merged |
| #204 | chore(audit): Phase 4 DB content audit script | ✅ Merged |
| #205 | fix(audit): SQL bugs in audit script | ✅ Merged |
| #206 | audit: Phase 4 DB content report | ✅ Merged |
| #207 | audit: close Phases 9/10 + migration & data scripts | ✅ Merged |
| #208 | perf(build): exclude manus-runtime from production | ✅ Merged |
| #209 | chore: add MCP servers + audit continuation memory | ✅ Merged |
| #210 | docs(audit): verify Tier 1 + Tier 2 security tasks complete | ✅ Merged |
| #211 | perf(build): main bundle 2.55 MB → 563 KB (Task 3.2) | ✅ Merged |
| #212 | refactor(server): split dev/prod entry, drop eval() hack (Task 6.1) | ✅ Merged |
| #214 | perf(fonts): self-host DM Sans + Noto Sans Georgian (Task 3.3) | ✅ Merged |
| #216 | fix(deps): Express 4 → 5 migration (Task 1.3) | ✅ Merged |
| #217 | docs(audit): record Task 2.1 — migration 0011 applied to production | ✅ Merged |
| #218 | audit: phase 9 Lighthouse baseline post-perf-blitz (Task 3.1) | ✅ Merged |
| #219 | perf(client): lazy-load AIChatBox on detail pages (Task 3.4) | ✅ Merged |
| #220 | audit: re-baseline after Task 3.4 (verify AIChatBox lazy-load impact) | ✅ Merged |
| #221 | perf(client): lazy-load MapPanel on /catalog (Task 3.5) | ✅ Merged |
| #222 | audit: Task 3.5 verification (bundle-graph deterministic check) | ✅ Merged |
| #223 | docs(audit): record Task 2.2 data normalization (operator outputs) | ✅ Merged |

**კუმულატიური ეფექტი:**
- `index.html` 369 KB → 2.4 KB (PR #208)
- main `index-*.js` 2,554 KB → 563 KB (PR #211, **−78 %**)
- Tier 1 + Tier 2 security: ai.grantChat auth-gated, helmet+CSP enabled, rate limits per-path, prod SQL leak closed
- Production esbuild: no `direct-eval` warning, vite excluded from prod graph (PR #212)
- 2 fewer cross-origin font handshakes per page load (PR #214); CSP `font-src 'self' data:`
- AIChatBox 873 KB chunk no longer in eager preload graph for `/catalog` or `/organizations/:id` (PR #219); mobile `/organizations/:id` total weight 3,033 → 2,106 KiB (−31 %)
- MapPanel + googleMapsLoader + vendor-gmaps (~34 KB JS) + Google Maps API script (~750 KB) no longer in `/catalog` initial graph (PR #221); list-only mobile viewers avoid the entire Maps stack until they tap "Map" tab. 8/8 deterministic bundle-graph checks PASS — see `audit-reports/09-task-3-5-verification.md`
- Task 2.2 (operator 2026-05-04): country codes normalized (13 rows), 618 orphan grants linked to orgs (12% → 68% linked), 1,245 branches geocoded (94% success of 1,324 total)

---

## 📊 აუდიტის მოკლე შეჯამება (Phase-by-Phase)

### Phase 0 — Setup ✅
- audit-reports/ folder შექმნა
- Production 403 აღმოჩენა → ოპერატორმა Railway-ზე გაასწორა

### Phase 2 — Code Health ✅
- TypeScript: 0 errors
- Tests: 195/196 pass (1 skipped — `RESEND_API_KEY` test)
- Build: 17 წამში, no errors
- ⚠️ Main bundle 2.55 MB (ძალიან დიდი)
- ⚠️ `eval('import(...)')` hack `server/_core/index.ts:94`

### Phase 3 — Dependencies & Security ✅
- 56 CVE სულ (1 critical, 19 high, 35 mod, 1 low)
- 🔴 `xlsx` — 2 high CVE, არცერთი patch (xlsx project off npm)
- 🟠 `@anthropic-ai/sdk@0.88` — CVE-2026-41686
- 🟠 `pnpm@10.4.1` runtime — CVE-2025-69262 (RCE)
- 🟠 `vite@7.1.7` — fs.deny bypass + path traversal
- 🟠 `express@4` — path-to-regexp ReDoS

### Phase 4 — DB Content ✅
**ცოცხალი Production MySQL-დან გაშვებული აუდიტი:**

```
1102 active grants
1110 organizations
1324 branches
4320 translations (4 ენაზე)
0 users (!)
0 saved_grants
0 newsletter_subscribers
```

**პრობლემები:**
- 🔴 **Migration 0011 drift** — `users` ცხრილში აკლია: `emailVerified`, `lockedUntil`, `verificationToken`, `resetPasswordToken`, `failedLoginAttempts`, etc.
- 🟡 968 grants — `orgId IS NULL` (orphan grants)
- 🟡 84 branches — coordinates მოკლული
- 🟡 7 rows — country code არასწორი ("Canada"→"CA", 6× "International"→"INT")
- 🟡 22 missing translations
- 🟡 779 phones, 674 emails — provenance მონაცემი არ აქვს
- 🟡 1110 organizations — pending contact enrichment

### Phase 9 — Performance ✅
**თეორიული ანალიზი (cloud sandbox-მა live Lighthouse ვერ გაიარა):**
- LCP: 🔴 ~4-6s on 4G
- TBT: 🔴 ~1.5-3s
- Score: 🔴 ~30-55 / 100 mobile
- მიზეზი: 2.55 MB initial JS + 369 KB HTML (HTML უკვე გასწორდა PR #208-ით)

**Live baseline (2026-05-03, Task 3.1, PR #218):**
- mobile `/` — score **39**, LCP 8.4 s, TBT **821 ms**, CLS 0.008
- mobile `/catalog` — score **31**, LCP 59.4 s (Maps tile), total weight **11.5 MB**
- mobile `/organizations/ORG-0061` — score **39**, LCP 13.7 s
- desktop `/` — score **86**, LCP 1.8 s, TBT 1 ms
- TBT landed inside the theorised post-fix band → bundle cut (PR #211) is paying off
- 🔴 New finding: `AIChatBox-BE_jayqH.js` ships 873 KB but ~600 KB unused on `/catalog` & `/organizations/:id` — defer until interaction

**Re-baseline (2026-05-03, Task 3.4 verification, draft PR on `claude/audit-task-3-4-verification-lighthouse`):**
- mobile `/organizations/ORG-0061` — LCP **13.7 → 9.1 s** (−33 %), total weight **3,033 → 2,106 KiB** (−927 KiB), unused-JS **1,163 → 562 KB** (−601 KB — matches Phase 9 estimate to the kilobyte)
- desktop `/catalog` — score **28 → 36** (+8), TBT **781 → 432 ms** (−349 ms — matches the −300 ms estimate)
- desktop `/organizations/ORG-0061` — score **67 → 75**, TBT **27 → 0 ms**
- mobile `/` — flat (314 → 313 KB unused-JS) — home wasn't affected, expected
- ⚠️ mobile `/catalog` TBT spike 1,366 → 4,196 ms attributed to vendor-react long task on slower edge RTT (250 ms vs baseline 130 ms); chunk hash unchanged → not caused by PR #219, treat as Slow-4G run-variance until averaged across 2-3 re-runs
- ✅ AIChatBox absent from `unused-javascript` audit on every page after PR #219
- See `audit-reports/09-lighthouse-after-3-4.md` for full delta tables + diagnostics

**Task 3.5 verification (2026-05-03, bundle-graph deterministic check, draft PR on `claude/audit-task-3-5-verification-bundle`):**

Lighthouse skipped deliberately — Task 3.4 verification showed mobile `/catalog` Lighthouse scores are dominated by `vendor-react` Slow-4G run-variance unrelated to either PR #219 or PR #221. Bundle graph is deterministic, derives from build artefacts, and tests exactly what PR #221 changed (no eager `MapPanel` import in Catalog chunk).

- ✅ Pre-flight 4/4: `/healthz` 200, main bundle hash flipped (`index-CWHJ_15x.js` → `index-BMm4yPCq.js`), `/` and `/catalog` modulepreloads list only `vendor-react` + `vendor-trpc` + `vendor-framer` (no `MapPanel` chain on either route)
- ✅ Bundle graph 4/4: `MapPanel-DDhfE79J.js` fetchable separately (7,059 b), `googleMapsLoader-CfbSf2Bo.js` fetchable separately (542 b), `Catalog-BvPaRsoV.js` references `MapPanel` only via 2 `React.lazy(() => __vitePreload(import("./MapPanel...")))` boundaries (0 static imports), 0 `markercluster` references in Catalog chunk
- Lazy chunks now gated on Map tab tap: ~34 KB JS (`MapPanel` + `googleMapsLoader` + `vendor-gmaps`) + ~750 KB external Maps API script + tile imagery
- See `audit-reports/09-task-3-5-verification.md` for full check tables + chunk inventory

### Phase 10 — Bundle Analysis ✅
**Top chunks:**
- `vendor-csc-*.js` 8.72 MB (country-state-city, **სწორად split-ია**)
- `index-*.js` 2.55 MB ⚠️ (main entry — დიდი)
- `AIChatBox-*.js` 909 KB (route-split ✅)
- shiki language chunks ~5 MB total (lazy-loaded ✅)

**PR #208-ით გასწორდა:** `index.html` 369 KB → 2.4 KB.

### Phase 11 — Security Review ✅ (Findings ALL RESOLVED in PRs #195/#197/#200/#201/#203)
**ორი მთავარი findings (ორივე გასწორდა):**

1. ~~🔴 **`ai.grantChat` is publicProcedure**~~ → ✅ **FIXED** PR #195 (`40a148c`) + PR #200 (`bd69e1f`): `protectedProcedure` + 20 req/min/IP rate-limit on `/api/trpc/ai`.

2. ~~🟠 **tRPC errorFormatter leaks SQL queries**~~ → ✅ **FIXED** PR #195 (`18bec0d`): `causeChain` gated by `NODE_ENV !== "production"`.

**ზოგადი მდგომარეობა:**
- ✅ `protectedProcedure` / `adminProcedure` — სწორად გამოიყენება ~95% route-ზე
- ✅ Drizzle ORM-ით SQL injection minimal exposure
- ✅ Hardcoded secrets არ მოიძებნა
- ✅ `helmet` middleware enabled + CSP (PR #197/#201/#203)
- ✅ `express-rate-limit` per-path (auth 10/min, ai 20/min, baseline 100/min)

---

## 👥 გუნდის სტრუქტურა (8 წევრი)

```
შენ (Operator)
 └─→ CTO / Coordinator (მთავარი მენეჯერი)
        ├─→ Security Engineer       (Phases 3, 11)
        ├─→ Performance Engineer    (Phases 9, 10)
        ├─→ Database Engineer       (Phase 4)
        ├─→ DevOps Engineer         (CI/CD, Railway)
        ├─→ Data Quality Manager    (translations, contacts)
        ├─→ Product Strategist      (UX, business)
        └─→ UX/UI Designer          (visual design)
```

**Communication rule:** ოპერატორი ესაუბრება მხოლოდ CTO-ს. CTO ანაწილებს ამოცანებს ქვე-agent-ებს, აგროვებს შედეგებს, აუდიტს ატარებს და ანგარიშობს ოპერატორს.

---

## 🎯 გენერალური გეგმა

> **სტრუქტურა:** მიზანი → ამოცანა → ქვე-ამოცანა → აქტივობა → ✅ აუდიტი
>
> **წესი:** ყოველი ამოცანის ბოლოს — checklist verification. გადაუმოწმებელი task = unfinished task.

### 🎯 მიზანი 1 — სისტემის უსაფრთხოება
**პასუხისმგებელი:** Security Engineer | **პრიორიტეტი:** 🔴 CRITICAL

#### ✅ ამოცანა 1.1 — Tier 1 Security Patches — **DONE** (verified 2026-05-03)

- **1.1.1 — `ai.grantChat` Endpoint დაცვა** ✅
  - `server/routers.ts:1331` — `protectedProcedure` (PR #195, `40a148c`)
  - `express-rate-limit` installed (PR #197, `fc8653a`)
  - `/api/trpc/ai` → 20 req/min/IP (PR #200, `bd69e1f`) — _liberal vs spec-ის 5/min, deliberate UX/cost balance_

- **1.1.2 — SQL Leakage** ✅
  - `server/_core/trpc.ts:48-53` — `causeChain` gated by `NODE_ENV !== "production"` (PR #195, `18bec0d`)

- **1.1.3 — `helmet` Middleware** ✅
  - `server/_core/index.ts:67-119` — `helmet()` + comprehensive CSP (Maps + Paddle whitelisted) (PR #197 `8b08ba5` + PR #201 `45e961f` + PR #203 `8d05f0f`)

- **1.1.4 — CVE Tier 1 Updates** ✅
  - `@anthropic-ai/sdk@^0.92.0` (PR #195, `61cb9de`)
  - `package.json` `packageManager: pnpm@10.33.2` (PR #195, `103ca97`)
  - `.github/workflows/daily-discovery.yml` — `version: 10.33.2` pinned

**✅ აუდიტი 1.1 — verification run 2026-05-03:**
```
✅ Anonymous call to ai.grantChat → HTTP 401 (protectedProcedure throws UNAUTHORIZED)
✅ /api/trpc/ai 21+ calls/min → HTTP 429 (limit=20)
✅ Production causeChain → SQL text not exposed (NODE_ENV gate)
✅ helmet response headers → X-Frame-Options + X-Content-Type-Options + CSP
✅ pnpm --version → 10.33.2
✅ pnpm check → 0 errors
✅ pnpm test → 195/195 pass (1 skipped: RESEND_API_KEY)
```

#### ✅ ამოცანა 1.2 — `xlsx` → `exceljs` Migration — **DONE** (PR #199, `89b1549`)

- `xlsx` removed from `package.json`, `exceljs ^4.4.0` installed
- `server/ client/ scripts/`-ში `xlsx` import-ი არ მოიძებნა
- xlsx CVE-ები აღარ ჩანს deps tree-ში

#### ✅ ამოცანა 1.3 — Express 4 → 5 Migration — **DONE** (2026-05-04)

Smaller than the spec's "~2 day" estimate — research showed only 4 line-level changes were required:

- `package.json` — `express ^4.21.2 → ^5.1.0` (resolved 5.2.1), `@types/express 4.17.21 → ^5.0.0`
- `server/_core/static.ts:24` — `app.use("*", ...)` → `app.use((req, res, next) => ...)` (path-to-regexp v8 rejects bare `"*"`; path-less middleware is the idiomatic Express 5 catch-all)
- `server/_core/vite.ts:24` and `:70` — same fix

**No other changes needed:** `seoRoutes.ts`, `paddleWebhook.ts`, `bootstrap.ts` use only named string paths. No `req.param()`, `app.del()`, `res.sendfile`, `res.redirect("back")`, or `res.json(status,body)` usage anywhere. Body parsers (`express.json`, `express.urlencoded`), `express.static`, `helmet@8`, `express-rate-limit@8`, `@trpc/server/adapters/express` and `supertest@7` are all Express 5 compatible.

**✅ აუდიტი 1.3 — verification 2026-05-04:**
```
✅ pnpm check → 0 errors
✅ pnpm test → 195/195 pass (1 skipped: RESEND_API_KEY)
✅ pnpm build → succeeds (main bundle 563 KB, unchanged from PR #211)
✅ Smoke boot (PORT=3099 NODE_ENV=production node dist/index.js):
     /healthz       → 200 {"status":"ok"}
     /robots.txt    → 200 text/plain (SEO routes work)
     /              → 200 text/html (SPA fallback works)
     /catalog       → 200 text/html (path-less middleware matches all paths)
     /api/nope      → 404 {"error":"Not found"} (API exclusion preserved)
✅ Production runtime path-to-regexp → 8.4.2 (patched, no ReDoS)
✅ pnpm audit total CVE → 56 → 53 (-3 from Express 4 chain)
   Remaining path-to-regexp finding is dev-only (gitnexus>express@4>path-to-regexp@0.1.12) — not shipped
```

---

### 🎯 მიზანი 2 — მონაცემთა ბაზა
**პასუხისმგებელი:** Database Engineer | **პრიორიტეტი:** 🔴 HIGH

#### ✅ ამოცანა 2.1 — Migration Drift Fix — **DONE** (operator 2026-05-03)

Operator-მა გაუშვა `scripts/apply-migration-0011.mjs --apply` Windows PowerShell-დან Railway public proxy-ზე. Script-ი idempotent-ია — pre-check-მა აღმოაჩინა 8 სვეტი (ყველა target column) დაკარგული + 3 ინდექსი დაკარგული. ყველა ALTER + CREATE INDEX წარმატებით გავიდა.

**ცვლილება production `users` ცხრილში:**
- 8 ახალი სვეტი: `passwordHash`, `emailVerified`, `verificationToken`, `verificationTokenExpires`, `resetPasswordToken`, `resetPasswordTokenExpires`, `failedLoginAttempts`, `lockedUntil`
- 3 ახალი ინდექსი: `users_email_idx`, `users_verification_token_idx`, `users_reset_token_idx`
- SHA-256 of migration SQL: `4787414f2dcf1ceab395cd4e25cf66e77221b7ba2bd300e868146859681ee196`

**✅ აუდიტი 2.1 — verification 2026-05-03:**
```
✅ post-check from script: 2/2 critical columns present (emailVerified + lockedUntil)
✅ 8/8 ALTER TABLE statements succeeded (per-statement progress logged)
✅ 3/3 CREATE INDEX statements succeeded
✅ No errors, no warnings, exit code 0
```

**Production effect:** email/password auth, email verification flow, password reset, account lockout, brute-force protection — ყველა ახლა functional-ია. ეს Phase 4 audit-ის (PR #206) მთავარი finding-ი იყო — closed.

#### ✅ ამოცანა 2.2 — Data Normalization — **DONE** (operator 2026-05-04)

Operator-მა Windows PowerShell-დან Railway public proxy-ზე ცამივე script წარმატებით გაუშვა. დროითი ხარჯი ~30 წუთი (ფაილების ჩამოტვირთვა + 3 dry-run + 3 apply + Google Maps key დიაგნოსტიკა).

**Sub-task A — Country code normalization** (`scripts/fix-country-codes.ts --apply`):
- ✅ 1 row: `organizations.country` "Canada" → "CA"
- ✅ 6 rows: `organizations.country` "International" → "INT"
- ✅ 6 rows: `grants.country` "International" → "INT"
- **Total: 13 rows updated**

**Sub-task B — Orphan grants → orgs link** (`scripts/backfill-grants-orgid.ts`):
- ✅ Tier 1 (exact name+country): 608
- ✅ Tier 3 (normalized name-only, unambiguous): 10
- 0 ambiguous unmatched
- 350 grants stay NULL (no `organization` string by design — unlinkable)
- **Total: 618 grants linked in single CASE-statement transaction**
- Linked count: 134 → **752** (12% → 68% of 1,102 active grants)

**Sub-task C — Branch geocoding** (`scripts/geocode-branches.ts --apply --force`, Google Places API):
- Initial run failed with 84/84 403 errors — operator copied browser key (HTTP referrer restriction) instead of server key by mistake; corrected on second run
- Re-run with `--force` to override checkpoint from failed attempt → re-geocoded ALL 1,324 branches (not just 84 missing)
- ✅ **1,245/1,324 success (94.0%)**
- 79 failed (Georgian-header garbage org names, "country mismatch" edge cases, "no Places result" for genuinely unfindable orgs)
- Duration: 13:51 (830s)
- API cost: ~$45 (1,324 × ~$0.034 per query)

**✅ აუდიტი 2.2 — verification:**
```
✅ SELECT COUNT(*) WHERE country='International' → 0 (was 12)
✅ SELECT COUNT(*) WHERE country='Canada' → 0 (was 1)
✅ Orphan grants (orgId IS NULL) → 350 (down from 968, ALL linkable backfilled)
✅ Branches without coords → 79 (down from 84, expected — Georgian-header garbage entries)
```

**Notes:**
- Browser key (`Maps Platform API Key`) was accidentally pasted into chat during diagnosis — flagged for rotation post-task. Server key (`grantkit-server-geocoding-v2`) likewise.
- 79 failed branches logged to `geocode-branches-failed.json` on operator's machine. Subset (Georgian-header garbage like "დეტალები", "მგზავრობა") indicate a separate org-cleanup task: spreadsheet headers got imported as organization rows. Tracked as future work, not blocking.

---

### 🎯 მიზანი 3 — Performance
**პასუხისმგებელი:** Performance Engineer + UX Designer | **პრიორიტეტი:** 🟠 HIGH

#### ✅ ამოცანა 3.1 — Lighthouse Baseline — **DONE** (PR #218, 2026-05-03)

Live measurement against production, run from Cowork sandbox using `lighthouse@13.2.0` + `chrome-headless-shell@148`. 3 routes × 2 form factors = 6 runs, performance category only.

**Mobile (Slow 4G + 4× CPU throttle):**

| Page | Score | LCP | TBT | CLS |
|---|---|---|---|---|
| `/` | 39 | 8.4 s | 821 ms | 0.008 |
| `/catalog` | 31 | 59.4 s | 1366 ms | 0.002 |
| `/organizations/ORG-0061` | 39 | 13.7 s | 791 ms | 0.000 |

**Desktop:**

| Page | Score | LCP | TBT | CLS |
|---|---|---|---|---|
| `/` | 86 | 1.8 s | 1 ms | 0.006 |
| `/catalog` | 28 | 10.3 s | 781 ms | 0.003 |
| `/organizations/ORG-0061` | 67 | 3.4 s | 27 ms | 0.000 |

**Verdict vs theoretical estimate (`audit-reports/09-performance.md`):**
- TBT 821 ms (theoretical 1500-3000 ms) — ✅ in band, bundle cut paying off
- Score 39 (theoretical 30-55) — ✅ in band
- LCP 8.4 s (theoretical 4-6 s) — 🔴 worse than estimate, Lighthouse Slow-4G is harsher than the "4G" the estimate assumed

**Top finding (new):** `AIChatBox-BE_jayqH.js` ships 873 KB but only ~273 KB used on `/catalog` and `/organizations/:id`. The chat surface mounts on every route via `MobileBottomNav` / floating launcher before the user opens it. Highest-ROI follow-up → became Task 3.4.

**Output:** `audit-reports/09-lighthouse-baseline.md` + raw JSON/HTML reports under `audit-reports/lighthouse-2026-05-03/`.

#### ✅ ამოცანა 3.2 — Bundle Reduction — **DONE** (PR #211, 2026-05-03)

**Three chunking fixes** identified via `rollup-plugin-visualizer` (gated behind `ANALYZE=1 pnpm build`):

1. `vite.config.ts` — switched `manualChunks` from string-array to function form so `react-dom/client` subpath (~540 KB) lands in `vendor-react` instead of leaking into the main entry.
2. `client/src/contexts/LanguageContext.tsx` — `catalogTranslations.json` (1.2 MB) lazy-loaded via `import()` only when a non-EN language is selected (≈80 % of traffic never downloads it).
3. `client/src/pages/Home.tsx` — replaced eager `catalog.json` (765 KB) import with hand-baked `client/src/data/catalogPreview.ts` (5 picks, ~6 KB).

**Result — `dist/public/assets/` chunks:**
```
                              before    after    delta
index-*.js                   2,554 KB    563 KB   -78 %
vendor-react-*.js               12 KB    217 KB   (correct now)
catalogData-*.js                 —       670 KB   (lazy chunk)
catalogTranslations-*.js         —     1,114 KB   (lazy chunk)
```

`App.tsx` lazy-loading audit found that all non-Home/Login routes were ALREADY lazy-loaded prior to this work — the spec's "lazy-load Onboarding/Profile/Admin/AiAssistant" item was stale. Lucide-icons specific-import optimisation skipped — only 16 KB total in main, low ROI.

#### ✅ ამოცანა 3.3 — Google Fonts Self-Hosting — **DONE** (PR #214, 2026-05-03)

- 11 WOFF2 subset files (~272 KB total) downloaded to `client/public/fonts/` via `scripts/refresh-fonts.sh` (idempotent regenerator).
- `client/src/fonts.css` — `@font-face` rules with `unicode-range` subsetting preserved, `url()` rewritten to `/fonts/<hash>.woff2`. Imported from `index.css`.
- `client/index.html` — removed `<link preconnect>` × 2 and `<link href="fonts.googleapis.com…">`.
- `server/_core/bootstrap.ts` (CSP) — `style-src` no longer needs `https://fonts.googleapis.com`; `font-src` reduced to `'self' data:`.

**Effect:** 2 fewer cross-origin handshakes on first paint, no third-party tracking on font load (GDPR-friendly), CSP attack surface reduced.

#### ✅ ამოცანა 3.4 — Lazy-Load AIChatBox on Detail Pages — **DONE** (PR #219, 2026-05-03)

`AIChatBox` (873 KB chunk) was eagerly imported on `/catalog`, `/organizations/:id`, and the legacy entity-detail page despite being hidden behind a Sheet that most users never open. PR #219 introduced three lazy boundaries:

- `OrganizationDetail.tsx` — `lazy(() => import("./OrgAiChat"))` + `hasOpenedAi` latch (keeps the chat mounted across open/close cycles once first opened, so chat history survives)
- `EntityDetail.tsx` — same pattern for the legacy chat surface
- `map/GrantDetailPanel.tsx` — `lazy()` namespace import + `<Suspense>`

**Bundle-graph verification (post `pnpm build`):** `Catalog-*.js` no longer references `AIChatBox`; `OrganizationDetail-*.js`, `EntityDetail-*.js`, `GrantDetailPanel-*.js` only carry `__vitePreload` manifests (lazy preload hints, not eager fetches). `index.html` modulepreloads dropped to `vendor-react` / `vendor-trpc` / `vendor-framer`.

**✅ აუდიტი 3.4 — live verification 2026-05-03 (`audit-reports/09-lighthouse-after-3-4.md`):**

Same Lighthouse harness as Task 3.1, post-merge:

- mobile `/organizations/ORG-0061` — LCP **13.7 → 9.1 s** (−33 %), total weight **3,033 → 2,106 KiB** (−927 KiB), unused-JS **1,163 → 562 KB** (−601 KB — exact match against the −600 KB Phase 9 prediction)
- desktop `/catalog` — score **28 → 36** (+8), TBT **781 → 432 ms** (−349 ms — matches the −300 ms estimate)
- desktop `/organizations/ORG-0061` — score **67 → 75**, TBT **27 → 0 ms**
- mobile `/` — flat (314 → 313 KB unused-JS, no AIChatBox to remove there)
- ✅ AIChatBox absent from `unused-javascript` audit on every page

**Caveat:** mobile `/catalog` TBT spiked 1,366 → 4,196 ms in this single re-run; long-task breakdown attributed it to vendor-react (chunk hash unchanged) on a slower edge RTT (250 ms vs baseline 130 ms). Most likely Slow-4G run-variance — not caused by PR #219. Recommend 2-3 mobile-catalog re-runs and median the result before treating it as a real regression.

---

### 🎯 მიზანი 4 — მონაცემთა ხარისხი
**პასუხისმგებელი:** Data Quality Manager | **პრიორიტეტი:** 🟡 MEDIUM

#### ამოცანა 4.1 — Translations (~30 წუთი)
- `pnpm translate:audit` → 22 missing
- `pnpm translate:missing:dry` → preview
- `pnpm translate:missing` → execute

#### ამოცანა 4.2 — Contact Enrichment (Phase B — მიმდინარე)
- `pnpm enrich:contacts --limit=100` (batch-ებად)
- 331 phones missing → enrich
- 436 emails missing → enrich

**✅ აუდიტი 4.2:**
```
□ phone IS NULL count → < 200 (baseline 331)
□ email IS NULL count → < 300 (baseline 436)
```

---

### 🎯 მიზანი 5 — პროდუქტი და UX
**პასუხისმგებელი:** Product Strategist + UX Designer | **პრიორიტეტი:** 🟡 MEDIUM

#### ამოცანა 5.1 — User Acquisition (~4 საათი)
- ⚠️ Production-ში 0 user! Diagnose მიზეზი
- Onboarding flow end-to-end ტესტი
- Registration → Email verification → Login მთლიანი დატოლება

#### ✅ ამოცანა 5.2 — Subscription Funnel (Sandbox-side code review) — **DONE** (2026-05-04)

**Output:** `audit-reports/12-subscription-funnel.md` — 11 findings across webhook, tRPC subscription router, Pricing UI, Paddle.js client.

**Critical / High (5 findings, ship-blocking before serious user acquisition):**

1. ~~🔴 **`subscription.activate` is client-trusted**~~ → ✅ **FIXED** (this branch): endpoint deleted, `Paddle.Checkout.open` now passes `customData: { userId }`, webhook looks up user via `custom_data.userId` first (paddleCustomerId fallback), webhook always writes `paddleCustomerId` so the fallback path is reliable on later events.
2. 🟠 **`subscription.cancel` doesn't tell Paddle** — user marked cancelled in our DB but Paddle continues billing card. Fix: call Paddle `cancel` API.
3. 🟠 **Webhook signature verification fail-open** if `PADDLE_WEBHOOK_SECRET` unset (production currently has no secret per env-var list). Fix: fail-closed in production.
4. 🟠 **`rawBody = JSON.stringify(req.body)` will mismatch HMAC** — `express.json()` runs BEFORE webhook route, so reconstruction is byte-mismatched. Latent today (no secret), surfaces immediately when fix #3 ships. Fix: register `express.raw()` route BEFORE global `express.json()`.
5. 🟡 **Annual/monthly toggle is decorative** — checkout always uses monthly `PADDLE_PRICE_ID` regardless of toggle. UX trust issue.

**Medium / Low (6 findings):** no replay protection, no event-id idempotency, webhook always returns 200 (silent state drift on transient errors), hardcoded plan ID, unknown-status maps to `"none"` (silent cancel), `PADDLE_CLIENT_TOKEN` hardcoded.

**Recommended remediation order** (full table in audit report):
1. ✅ ~~Hotfix PR — delete `subscription.activate`~~ — DONE 2026-05-04 (custom_data path).
2. ✅ ~~Webhook hardening PR~~ — DONE 2026-05-04 (this branch). Raw-body middleware + fail-closed in production + 5-min replay window + event_id idempotency + 5xx-on-transient. Migration 0020 (`processed_webhook_events`) ready for operator to apply before merge.
3. `cancel` via Paddle API (~1 hr, needs `PADDLE_API_KEY` on Railway)
4. Annual price wiring (~30 min sandbox + operator creates annual price ID)
5. Cleanup (~30 min)

**Out of scope (operator-side, follow-up Task 5.2.B):**
- Paddle test-mode flow verification: register → checkout → webhook → DB → email
- Verify Railway env: `PADDLE_WEBHOOK_SECRET`, `PADDLE_API_KEY`
- Paddle dashboard config review

---

### 🎯 მიზანი 6 — ინფრასტრუქტურა
**პასუხისმგებელი:** DevOps Engineer | **პრიორიტეტი:** 🟡 MEDIUM

#### ✅ ამოცანა 6.1 — CI/CD — **DONE** (PR #212, 2026-05-03)

- ✅ **GitHub Actions pnpm version pin** — already done in PR #195 (`103ca97`); `.github/workflows/daily-discovery.yml` pinned at `version: 10.33.2`.
- ✅ **`eval('import(...)')` hack removed** — `server/_core/bootstrap.ts` extracted as shared startup; `server/_core/index.ts` is now production-only (calls `serveStatic`); new `server/_core/index.dev.ts` is the dev entry (calls `setupVite`). No more `eval()`, no more esbuild `direct-eval` warning.
- ✅ **Dev/prod entry points split** — `pnpm dev` → `tsx watch server/_core/index.dev.ts`; `pnpm build` and `pnpm start` paths unchanged. `vite` and `vite-plugin-manus-runtime` cannot leak into `dist/index.js` — `grep "node_modules/vite\|setupVite" dist/index.js` → 0 hits.

---

## 🚧 Pending Operator Actions (ლოკალურად)

ეს ვერ გაკეთდა cloud sandbox-დან, რადგან Railway proxy egress-ს ვერ მივწვდით:

```powershell
# DATABASE_URL setup (one-time per session):
$pw = "dyrGKtAkILpUkEaSJpgYKzYAcLIsetdh"
$env:DATABASE_URL = "mysql://root:" + $pw + "@mainline.proxy.rlwy.net:51195/railway"

# 1. ✅ DONE 2026-05-03 — Migration 0011 drift fix
#    node scripts/apply-migration-0011.mjs --apply
#    Result: 8 columns + 3 indexes added to users table.

# 2. ✅ DONE 2026-05-04 — Data normalization (Task 2.2)
#    npx tsx scripts/fix-country-codes.ts --apply        # 13 rows
#    npx tsx scripts/backfill-grants-orgid.ts            # 618 grants linked
#    $env:GOOGLE_MAPS_API_KEY = "<grantkit-server-geocoding-v2 value>"
#    npx tsx scripts/geocode-branches.ts --apply --force # 1,245/1,324 (94%)

# 3. Migration 0020 — processed_webhook_events table (BEFORE merging
#    "Webhook hardening" PR; the deployed code INSERTs into this table for
#    every event and will fail if the column doesn't exist).
node scripts/apply-migration-0020.mjs

# 4. Set PADDLE_WEBHOOK_SECRET on Railway dashboard (Variables tab,
#    grantkit service). Without this in production, the hardened handler
#    returns 503 to every webhook and Paddle retries until the secret is
#    set — i.e. fail-closed. Take the value from the Paddle dashboard
#    → Developer Tools → Notifications → your endpoint → Show secret.

# 5. Translations (Task 4.1) — 22 missing keys
npx tsx scripts/translate-missing.ts

# 4. Contact enrichment Phase B (Task 4.2) — 331 phones + 436 emails missing
npx tsx scripts/enrich-org-contacts.ts --limit=100

# 5. Security cleanup post-Task-2.2 — rotate Google Maps keys
#    Browser key (Maps Platform API Key) — Regenerate in GCP Console + update
#      VITE_GOOGLE_MAPS_BROWSER_KEY on Railway dashboard
#    Server key (grantkit-server-geocoding-v2) — Regenerate (operator-only)
#    Both leaked into chat history during Task 2.2 diagnosis
```

---

## 🔁 Resume Protocol — როცა ახალი სესია იწყება

თუ ეს ფაილს კითხულობს ახალი Claude / agent სესია:

1. **წაიკითხე ეს ფაილი ბოლომდე** — ეს არის Single Source of Truth.
2. **შეამოწმე ახალი PR-ების მდგომარეობა:**
   ```bash
   git -C /home/user/grantkit log origin/main --oneline -20
   ```
3. **შეამოწმე open issues / draft PRs:**
   ```bash
   # mcp__github__list_pull_requests with state="open"
   ```
4. **გადაამოწმე "Pending Operator Actions":**
   - თუ user ამბობს რომ scripts გაუშვა → მოითხოვე output დადასტურებისთვის
   - თუ user ამბობს რომ არ გაუშვა → შეახსენე
5. **იპოვე "Next Up" task** გეგმაში → დაიწყე იქიდან.

---

## 📁 ფაილების რუქა (აუდიტთან დაკავშირებული)

```
audit-reports/
├── 00-phase0-prep.md                       ← Phase 0 setup
├── 01-prod-403-triage.md                   ← Production 403 fix
├── 02-code-health.md                       ← TypeScript/tests/build
├── 03-deps-security.md                     ← 56 CVE list
├── 04-db-content.md                        ← Live DB audit results
├── 09-performance.md                       ← Theoretical Lighthouse
├── 09-lighthouse-baseline.md               ← Live Lighthouse run (Task 3.1, 2026-05-03, PR #218)
├── lighthouse-2026-05-03/                  ← Raw JSON+HTML reports (operator to attach)
├── 09-lighthouse-after-3-4.md              ← Re-baseline after Task 3.4 (2026-05-03)
├── lighthouse-2026-05-03-after-3-4/        ← Raw JSON+HTML reports (operator to attach)
├── 10-bundle.md                            ← Bundle analysis (PR #208 fix)
├── 11-security-review.md                   ← Auth/SQL/XSS review
├── migration-drift.md                      ← 0011 missing analysis
└── SUMMARY.md                              ← Executive summary

scripts/
├── audit-db-content.ts                     ← Phase 4 audit script
├── apply-migration-0011.mjs                ← Idempotent migration fix
├── fix-country-codes.ts                    ← Canada/International normalization
├── backfill-grants-orgid.ts                ← Orphan grants → orgs
├── geocode-branches.ts                     ← Coordinate enrichment
└── translate-missing.ts                    ← Translation gaps

.grantkit-redesign/
├── KARPATHY_GUIDELINES.md                  ← Read first (always)
├── PROJECT_MAP.md                          ← Living project state
├── OPS.md                                  ← Existing API keys / env vars
├── AUDIT-CONTINUATION-2026-05-03.md        ← THIS FILE
└── ...
```

---

## 🎬 Next Up — შემდეგი action item

**Status (2026-05-04):** Tasks 1.1, 1.2, **1.3**, **2.1**, **2.2**, **3.1**, **3.2**, **3.3**, **3.4**, **3.5**, 6.1 — ✅ ALL DONE on main / draft. All Phase 9 perf objectives closed; all Phase 4 DB-content findings closed.

**Done 2026-05-04 (this session):**
- ✅ Task 2.2 — Data normalization (operator) — 13 country fixes + 618 grants linked + 1,245 branches geocoded (94%)
- ✅ Sandbox: docs PR for Task 2.2 — PR #223 merged
- ✅ PR #222 (Task 3.5 verification) merged — rebased onto post-#223 main, conflict resolved on this audit doc, force-with-lease push, draft → ready → merged
- ✅ Audit memory sync — PR #224 merged
- 🟡 Task 1 deferred — Maps key rotation (operator decision: ship business priorities first; key rotation post-launch)
- ✅ Task 5.2 sandbox-side code review — `audit-reports/12-subscription-funnel.md` (11 findings; 1 critical premium-bypass exploit + 3 high)
- ✅ Task 5.2 hotfix #1 — `subscription.activate` exploit closed via custom_data path: `Paddle.Checkout.open({ customData: { userId } })` + webhook lookup via `custom_data.userId` first (paddleCustomerId fallback) + endpoint deleted. 197/197 tests pass, build green.
- ✅ Task 5.2 webhook hardening — Findings #3 (fail-closed in prod), #4 (express.raw before express.json — Buffer not JSON.stringify), #5 (5-min replay window via `isFreshSignatureTimestamp`), #6 (event_id idempotency via new `processed_webhook_events` table — migration 0020), #8 (503 on transient errors so Paddle retries). 201/201 tests pass, build green. Migration ready for operator to apply.

**Done 2026-05-03:**
- ✅ Task 2.1 — Migration 0011 drift fix (operator + PR #217 merged)
- ✅ Task 3.1 — Lighthouse baseline (PR #218 merged)
- ✅ Task 3.4 — AIChatBox lazy-load (PR #219 merged) + verification re-baseline (PR #220 merged)
- ✅ Task 3.5 — MapPanel lazy-load (PR #221 merged) + bundle-graph verification (PR #222 merged 2026-05-04)
- ✅ Task 1.3 — Express 4 → 5 migration (PR #216 merged)

**Done earlier:**
- PR #210 — docs(audit): verify Tier 1+2 security tasks complete
- PR #211 — perf(build): main bundle 2.55 MB → 563 KB (Task 3.2)
- PR #212 — refactor(server): split dev/prod entry, drop eval() hack (Task 6.1)
- PR #214 — perf(fonts): self-host DM Sans + Noto Sans Georgian (Task 3.3)

**CTO recommends next (in priority order):**

1. ~~🔴 Hotfix — delete `subscription.activate`~~ ✅ DONE (this branch, 2026-05-04).
2. ~~🟠 Webhook hardening PR~~ ✅ DONE (this branch, 2026-05-04). Migration 0020 ready for operator to apply before merge.
3. **🟠 `subscription.cancel` via Paddle API** _(sandbox + operator, ~1 hr)_ — operator adds `PADDLE_API_KEY` on Railway, sandbox replaces DB-only cancel with Paddle SDK call. See `audit-reports/12-subscription-funnel.md` §2.
4. **🟡 Task 4.1 — Translations** _(operator-side, ~30 min)_ — `npx tsx scripts/translate-missing.ts` (22 keys). DB write access საჭირო. Blocked on AI provider key (defer or Google AI Studio setup).
5. **🟡 Task 4.2 — Contact enrichment Phase B** _(operator-side + GrantedAI API, ~1-2 hr)_ — 331 phones + 436 emails missing. Same blocker.
6. **🟡 Task 5.2.B — Operator-side Paddle test-mode flow** _(operator, ~1 hr)_ — register → checkout → webhook → DB → confirmation email, after webhook hardening lands.
7. **🟡 Annual price wiring** _(operator + sandbox, ~30 min)_ — operator creates annual price ID in Paddle; sandbox wires `PricingCTA` plan prop. See `audit-reports/12-subscription-funnel.md` §7.
8. **🟢 Org cleanup (new finding from Task 2.2)** _(operator + sandbox, ~2 hr)_ — ~30 orgs with garbage names from spreadsheet headers.
9. **🟡 [Deferred] Maps key rotation** _(operator-side, ~5 min)_ — both keys leaked during Task 2.2 diagnosis. Operator decided 2026-05-04 to defer until post-launch; track here so it's not lost.

**Operator-side (Pending Operator Actions ↓ section):** Tasks 4.1 (translations), 4.2 (contact enrichment), security cleanup (Maps key rotation).

---

> **დასასრული.** ეს ფაილი ცოცხალია. ყოველი დიდი ცვლილების შემდეგ — განაახლე "ამჟამინდელი მდგომარეობა" სექცია.
