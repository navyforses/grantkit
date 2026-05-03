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
| Latest commit on main | `0f83760 perf(build): exclude manus-runtime + debug-collector from production` (PR #208) |
| Active development branch | `claude/add-mcp-servers-6tRzu` (this file lives here) |
| Last merged audit PR | #208 (manus-runtime production fix) |
| Last DB migration on production | `0010_*` (drift detected — 0011-0016 PARTIALLY applied) |
| Pending operator actions | 2 local DB scripts (see "Pending Actions" section) |

---

## ✅ უკვე დასრულებული სამუშაო (PR-ები)

| PR | სათაური | Status |
|---|---|---|
| #194 | audit: phase 0-3 baseline reports | ✅ Merged |
| #198 | docs: catalog unfreeze | ✅ Merged |
| #204 | chore(audit): Phase 4 DB content audit script | ✅ Merged |
| #205 | fix(audit): SQL bugs in audit script | ✅ Merged |
| #206 | audit: Phase 4 DB content report | ✅ Merged |
| #207 | audit: close Phases 9/10 + migration & data scripts | ✅ Merged |
| #208 | perf(build): exclude manus-runtime from production | ✅ Merged |

**ეფექტი:** `index.html` 369 KB → 2.4 KB (production load time გაუმჯობესდა).

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

### Phase 10 — Bundle Analysis ✅
**Top chunks:**
- `vendor-csc-*.js` 8.72 MB (country-state-city, **სწორად split-ია**)
- `index-*.js` 2.55 MB ⚠️ (main entry — დიდი)
- `AIChatBox-*.js` 909 KB (route-split ✅)
- shiki language chunks ~5 MB total (lazy-loaded ✅)

**PR #208-ით გასწორდა:** `index.html` 369 KB → 2.4 KB.

### Phase 11 — Security Review ✅
**ორი მთავარი findings:**

1. 🔴 **`ai.grantChat` is publicProcedure** — ანონიმური ვიზიტორებისთვის ღია, no rate limit. Anthropic API spend exposure.

2. 🟠 **tRPC errorFormatter leaks SQL queries** — `causeChain` production-ში SQL text-ს კლიენტს უბრუნებს.

**კარგი ნაწილი:**
- ✅ `protectedProcedure` / `adminProcedure` — სწორად გამოიყენება ~95% route-ზე
- ✅ Drizzle ORM-ით SQL injection minimal exposure
- ✅ Hardcoded secrets არ მოიძებნა
- ❌ `helmet` middleware არ არის
- ❌ `express-rate-limit` არ არის

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

#### ამოცანა 1.1 — Tier 1 Security Patches (~1 საათი)

- **1.1.1 — `ai.grantChat` Endpoint დაცვა**
  - `server/routers.ts:1328` — `publicProcedure` → `protectedProcedure`
  - `pnpm add express-rate-limit`
  - 5 req/min/IP ლიმიტი `/api/trpc/ai.*`-ზე

- **1.1.2 — SQL Leakage**
  - `server/_core/trpc.ts:31-52` — `causeChain` → `NODE_ENV !== "production"` guard

- **1.1.3 — `helmet` Middleware**
  - `app.use(helmet())` `server/_core/index.ts`-ში

- **1.1.4 — CVE Tier 1 Updates**
  - `pnpm update @anthropic-ai/sdk@latest` (→ 0.92.x)
  - `corepack use pnpm@10.33.2`
  - `package.json` `packageManager` field განახლება
  - `.github/workflows/daily-discovery.yml` — `version: 10.33.2` pin

**✅ აუდიტი 1.1:**
```
□ Anonymous call to ai.grantChat → HTTP 401
□ 6+ calls/min from same IP → HTTP 429
□ Production error response → SQL text not exposed
□ Response headers → X-Frame-Options, X-Content-Type-Options
□ pnpm --version → 10.33.2
□ pnpm test → 195/195 pass
```

#### ამოცანა 1.2 — `xlsx` → `exceljs` Migration (~3 საათი)
- `grep -rn "xlsx" server/ client/ scripts/`
- `server/importGrants.ts` refactor
- `package.json`-დან xlsx-ის წაშლა

**✅ აუდიტი 1.2:**
```
□ xlsx removed from package.json
□ Excel import in admin panel → მუშაობს
□ pnpm audit → xlsx CVE-ები აღარ ჩანს
```

#### ამოცანა 1.3 — Express 4 → 5 Migration (~2 დღე, ცალკე PR)
- Migration guide-ის შესწავლა
- Middleware-ების refactor (async errors, body-parser)
- `pnpm update express@5 @types/express@5`

**✅ აუდიტი 1.3:**
```
□ pnpm test → 195/195 pass
□ Login/catalog/admin → manual smoke pass
□ pnpm audit → path-to-regexp CVE აღარ ჩანს
```

---

### 🎯 მიზანი 2 — მონაცემთა ბაზა
**პასუხისმგებელი:** Database Engineer | **პრიორიტეტი:** 🔴 HIGH

#### ამოცანა 2.1 — Migration Drift Fix (~30 წუთი)
**ⓘ ლოკალური ოპერაცია — Cloud sandbox Railway-ს ვერ წვდება**

```powershell
$pw = "dyrGKtAkILpUkEaSJpgYKzYAcLIsetdh"
$env:DATABASE_URL = "mysql://root:" + $pw + "@mainline.proxy.rlwy.net:51195/railway"
node scripts/apply-migration-0011.mjs           # dry-run preview
node scripts/apply-migration-0011.mjs --apply   # production execute
```

**✅ აუდიტი 2.1:**
```
□ scripts/audit-db-content.ts → Sections 11, 12 → "Query failed" გაქრა
□ SELECT emailVerified FROM users LIMIT 1 → no error
□ SELECT lockedUntil FROM users LIMIT 1 → no error
```

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

#### ამოცანა 3.1 — Lighthouse Baseline (~30 წუთი)
- Chrome DevTools → Lighthouse → Production URL
- Desktop + Mobile + `/catalog` route
- → `audit-reports/09-lighthouse-baseline.md`

#### ამოცანა 3.2 — Bundle Reduction (~4 საათი)
- `pnpm add -D rollup-plugin-visualizer`
- `client/src/App.tsx` — lazy-load remaining routes (Onboarding, Profile, Admin, AiAssistant)
- Lucide icons → specific imports
- **Target:** main bundle < 1.5 MB

**✅ აუდიტი 3.2:**
```
□ pnpm build → main index-*.js < 1.5 MB
□ Onboarding route → on-demand chunk
□ Lighthouse LCP → improvement vs baseline
```

#### ამოცანა 3.3 — Google Fonts Self-Hosting (~30 წუთი)
- DM Sans local download
- `client/index.html`-დან external link წაშლა
- Tailwind `@font-face` rule

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

#### ამოცანა 6.1 — CI/CD (~2 საათი)
- GitHub Actions pnpm version pin (security)
- `eval('import(...)')` hack-ის ჩანაცვლება
- Dev/prod entry points გათიშვა (`index.dev.ts` / `index.prod.ts`)

---

## 🚧 Pending Operator Actions (ლოკალურად)

ეს ვერ გაკეთდა cloud sandbox-დან, რადგან Railway proxy egress-ს ვერ მივწვდით:

```powershell
# 1. Migration drift fix (CRITICAL — production auth-ს აფერხებს)
$pw = "dyrGKtAkILpUkEaSJpgYKzYAcLIsetdh"
$env:DATABASE_URL = "mysql://root:" + $pw + "@mainline.proxy.rlwy.net:51195/railway"
node scripts/apply-migration-0011.mjs --apply

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

**CTO recommends:** ამოცანა **1.1** (Tier 1 Security Patches) + ამოცანა **2.1** (Migration drift) — **პარალელურად**, რადგან ორივე 🔴 CRITICAL და დამოუკიდებელია.

- 1.1 — Code-side, ერთ PR-ად შეფუთვა
- 2.1 — ოპერატორის ლოკალური ნაბიჯი (script უკვე shipped main-ზე)

შემდეგ — `Lighthouse baseline` → `Bundle reduction`.

---

> **დასასრული.** ეს ფაილი ცოცხალია. ყოველი დიდი ცვლილების შემდეგ — განაახლე "ამჟამინდელი მდგომარეობა" სექცია.
