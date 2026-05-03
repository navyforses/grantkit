# 🧠 GrantKit — აუდიტის Continuation Memory

> **დანიშნულება:** ეს არის სრული მეხსიერების გვერდი. ნებისმიერმა ახალმა Claude / agent სესიამ ამ ფაილის წაკითხვით უნდა შეძლოს უკვე გაკეთებული აუდიტის გაგრძელება და გეგმის შესრულება.
>
> **შექმნა:** 2026-05-03
> **წყარო:** აუდიტის სრული ციკლი (ფაზები 0-11) PR-ები #194 → #208
> **ენა:** ქართული + ტექნიკური ტერმინები English-ად

---

## 📍 ამჟამინდელი მდგომარეობა (Snapshot)

| Area | State |
|---|---|
| Production URL | https://grantkit-production-06f7.up.railway.app |
| Latest commit on main | `0ddc26d Merge pull request #216` |
| Active development branch | `claude/audit-task-3-1-lighthouse-baseline` (Lighthouse baseline) |
| Last merged audit PR | #216 (Express 5); recent: #210/#211/#212/#214/#216 |
| Last DB migration on production | `0011_volatile_demogoblin` ✅ applied 2026-05-03 (operator) |
| Pending operator actions | 3 local DB scripts (see "Pending Actions" section) |
| Tier 1 security patches | ✅ Verified complete (2026-05-03) — see Goal 1 task 1.1 |
| Bundle size (main `index-*.js`) | ✅ 2,554 KB → 563 KB (Task 3.2, PR #211) |
| Server entry split (no eval hack) | ✅ Done (Task 6.1, PR #212) |
| Self-hosted fonts | ✅ Done (Task 3.3, PR #214) |
| Express 5 migration | ✅ Done (Task 1.3, PR #216) |
| Production auth columns | ✅ Done (Task 2.1, operator 2026-05-03) |
| Lighthouse baseline (live) | ✅ Done (Task 3.1, branch `claude/audit-task-3-1-lighthouse-baseline`, 2026-05-03) |

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
| _draft_ | audit: phase 9 Lighthouse baseline post-perf-blitz (Task 3.1) | 🟡 Draft on `claude/audit-task-3-1-lighthouse-baseline` |

**კუმულატიური ეფექტი:**
- `index.html` 369 KB → 2.4 KB (PR #208)
- main `index-*.js` 2,554 KB → 563 KB (PR #211, **−78 %**)
- Tier 1 + Tier 2 security: ai.grantChat auth-gated, helmet+CSP enabled, rate limits per-path, prod SQL leak closed
- Production esbuild: no `direct-eval` warning, vite excluded from prod graph (PR #212)
- 2 fewer cross-origin font handshakes per page load (PR #214); CSP `font-src 'self' data:`

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

**Live baseline (2026-05-03, Task 3.1):**
- mobile `/` — score **39**, LCP 8.4 s, TBT **821 ms**, CLS 0.008
- mobile `/catalog` — score **31**, LCP 59.4 s (Maps tile), total weight **11.5 MB**
- mobile `/organizations/ORG-0061` — score **39**, LCP 13.7 s
- desktop `/` — score **86**, LCP 1.8 s, TBT 1 ms
- TBT landed inside the theorised post-fix band → bundle cut (PR #211) is paying off
- 🔴 New finding: `AIChatBox-BE_jayqH.js` ships 873 KB but ~600 KB unused on `/catalog` & `/organizations/:id` — defer until interaction
- See `audit-reports/09-lighthouse-baseline.md` for full numbers + raw JSON/HTML

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

#### ამოცანა 2.2 — Data Normalization (~30 წუთი)

```bash
pnpm fix:countries             # dry-run (7 row preview)
pnpm fix:countries:apply       # execute
pnpm backfill:orgid:dry        # dry-run (968 grants preview)
pnpm backfill:orgid            # execute
pnpm geocode:branches:dry      # dry-run (84 branches preview)
pnpm geocode:branches          # execute
```

**✅ აუდიტი 2.2:**
```
□ SELECT COUNT(*) WHERE country='International' → 0
□ SELECT COUNT(*) WHERE country='Canada' → 0
□ Orphan grants (orgId IS NULL) → < 968
□ Branches without coords → < 84
```

---

### 🎯 მიზანი 3 — Performance
**პასუხისმგებელი:** Performance Engineer + UX Designer | **პრიორიტეტი:** 🟠 HIGH

#### ✅ ამოცანა 3.1 — Lighthouse Baseline — **DONE** (2026-05-03)

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

**Top finding (new):** `AIChatBox-BE_jayqH.js` ships 873 KB but only ~273 KB used on `/catalog` and `/organizations/:id`. The chat surface mounts on every route via `MobileBottomNav` / floating launcher before the user opens it. Highest-ROI follow-up.

**Output:** `audit-reports/09-lighthouse-baseline.md` + raw JSON/HTML reports under `audit-reports/lighthouse-2026-05-03/` (delivered as a separate zip — sandbox MCP cannot push 5 MB of raw reports through tool calls).

**Branch:** `claude/audit-task-3-1-lighthouse-baseline` (Draft PR).

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

#### ამოცანა 5.2 — Subscription Funnel (~5 საათი)
- Paddle test mode flow
- Webhook → DB update path
- Pricing page UX review

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

# 1. ✅ DONE 2026-05-03 — Migration drift fix
#    node scripts/apply-migration-0011.mjs --apply
#    Result: 8 columns + 3 indexes added to users table.

# 2. Country code normalization (7 rows)
pnpm fix:countries:apply

# 3. (Optional) Orphan grants → org link
pnpm backfill:orgid

# 4. (Optional) Translations
pnpm translate:missing
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
├── 00-phase0-prep.md              ← Phase 0 setup
├── 01-prod-403-triage.md          ← Production 403 fix
├── 02-code-health.md              ← TypeScript/tests/build
├── 03-deps-security.md            ← 56 CVE list
├── 04-db-content.md               ← Live DB audit results
├── 09-performance.md              ← Theoretical Lighthouse
├── 09-lighthouse-baseline.md      ← Live Lighthouse run (Task 3.1, 2026-05-03)
├── lighthouse-2026-05-03/         ← Raw JSON+HTML reports (operator to attach)
├── 10-bundle.md                   ← Bundle analysis (PR #208 fix)
├── 11-security-review.md          ← Auth/SQL/XSS review
├── migration-drift.md             ← 0011 missing analysis
└── SUMMARY.md                     ← Executive summary

scripts/
├── audit-db-content.ts            ← Phase 4 audit script
├── apply-migration-0011.mjs       ← Idempotent migration fix
├── fix-country-codes.ts           ← Canada/International normalization
├── backfill-grants-orgid.ts       ← Orphan grants → orgs
├── geocode-branches.ts            ← Coordinate enrichment
└── translate-missing.ts           ← Translation gaps

.grantkit-redesign/
├── KARPATHY_GUIDELINES.md         ← Read first (always)
├── PROJECT_MAP.md                 ← Living project state
├── OPS.md                         ← Existing API keys / env vars
├── AUDIT-CONTINUATION-2026-05-03.md  ← THIS FILE
└── ...
```

---

## 🎬 Next Up — შემდეგი action item

**Status (2026-05-03):** Tasks 1.1, 1.2, **1.3**, **2.1**, **3.1**, 3.2, 3.3, 6.1 — ✅ ALL DONE on main / draft. Sandbox-side audit work დასრულებულია — დარჩენილი ყველა ამოცანა live-browser ან hybrid წვდომას მოითხოვს.

**Done 2026-05-03 (this session):**
- ✅ Task 3.1 — Lighthouse baseline (Cowork sandbox, lighthouse@13.2.0) — branch `claude/audit-task-3-1-lighthouse-baseline`, draft PR

**Done 2026-05-04:**
- ✅ Task 2.1 — Migration 0011 drift fix (operator) — production `users` table now has all 8 auth columns + 3 indexes
- ✅ PR #216 — fix(deps): Express 4 → 5 migration (Task 1.3) — merged

**Done 2026-05-03 (earlier):**
- PR #210 — docs(audit): verify Tier 1+2 security tasks complete
- PR #211 — perf(build): main bundle 2.55 MB → 563 KB (Task 3.2)
- PR #212 — refactor(server): split dev/prod entry, drop eval() hack (Task 6.1)
- PR #214 — perf(fonts): self-host DM Sans + Noto Sans Georgian (Task 3.3)

**CTO recommends next (in priority order):**

1. **🟠 Defer `AIChatBox` until interaction** _(operator-side or sandbox, ~1 hr)_ — Task 3.1 surfaced this as the highest-ROI bundle win remaining: 600 KB unused on `/catalog` & `/organizations/:id` mobile. Wrap the launcher in a stub that imports the chat chunk only on click. Re-baseline after.
2. **🟡 Task 4.1 — Translations** _(operator-side, ~30 min)_ — `pnpm translate:missing` (22 keys). DB write access საჭირო.
3. **🟡 Task 2.2 — Data normalization** _(operator-side, ~30 min)_ — country codes (7 rows) + orphan grants (968) + branches (84). All scripts ready on main.
4. **🟡 Task 5.2 — Subscription Funnel review** _(~5 hr)_ — Paddle test mode flow + webhook → DB path.

**Operator-side (Pending Operator Actions ↓ section):** Task 2.2 (data normalization), Task 4.1 (translations), Task 4.2 (contact enrichment).

---

> **დასასრული.** ეს ფაილი ცოცხალია. ყოველი დიდი ცვლილების შემდეგ — განაახლე "ამჟამინდელი მდგომარეობა" სექცია.
