# INFRASTRUCTURE_MAP.md — Phase D

> **Phase:** D (Scripts, CRON, External APIs)
> **Owner:** Hana (diagnostic session 2026-04-23)
> **Scope:** მთელი non-UI ინფრასტრუქტურა — ყველა ფაილი რომელიც ბაზას, გარე API-ებს ან განრიგს ეხება.
> **Prerequisite reading:** `ORG-CENTRIC-MEMORY.md`, `CLAUDE.md`, `.grantkit-redesign/OPS.md`.

---

## 1. 📜 Scripts Inventory (52 ფაილი `scripts/`-ში)

### 1.1. ცოცხალი — `package.json`-ში ნახსენები (20 script)

| npm script | ფაილი | რას აკეთებს | გარე API | DB write? |
|---|---|---|---|---|
| `toolbox:start` | `start-toolbox.sh` | googleapis/mcp-toolbox-ს აქსხივებს MySQL-ზე (MCP port 5000) | — | read-only |
| `gitnexus:analyze` | `(gitnexus bin)` | კოდბაზის knowledge graph აგება | — | — |
| `gitnexus:serve` | `(gitnexus bin)` | MCP server port 4747 | — | — |
| `enrich:descriptions` | `enrich-descriptions.ts` | LLM-ით grants.description ივსება (< 50 char rows) | OpenRouter / Google AI | ✏️ |
| `enrich:metadata` | `enrich-metadata.ts` | deadline, appProcess, ageRange, docs... | OpenRouter | ✏️ |
| `translate:audit` | `audit-translations.ts` | grant_translations coverage report | — | read-only |
| `translate:missing` | `translate-missing.ts` | FR/ES/RU/KA თარგმანები | OpenRouter | ✏️ |
| `discovery` | `daily-discovery.ts` | LLM-ს ეკითხება ახალ გრანტებს → JSON ფაილი | OpenRouter | — (მხოლოდ write JSON) |
| `discovery:dry` | იგივე, `--dry-run` | — | OpenRouter | — |
| `import:grants` | `import-new-grants.ts` | JSON → DB + enrichment + translate + notify | OpenRouter + Resend | ✏️✏️✏️ |
| `geocode:grants` | `geocode-grants.ts` | grants.latitude/longitude Google Geocoding | Google Maps | ✏️ |
| `geocode:grants:limit10` | იგივე `--limit=10` | 10-row smoke test | Google Maps | ✏️ |
| `normalize:countries` | `normalize-country-codes.ts` | ISO-2 სტანდარტი country ველში | — | ✏️ |
| `sitemap:generate` | `generate-sitemap.ts` | public/sitemap.xml | — | read-only |
| `audit:locations` | `audit-locations.ts` | geo coverage report (790 vs 538 mystery) | — | read-only |
| `enhance:locations` | `enhance-locations.ts` | organization_branches-ში ცარიელი ველების შევსება | — | ✏️ |
| `import:organizations` | `import-organizations.ts` | CSV → organizations ცხრილი | — | ✏️ |
| `db:push` | `(drizzle-kit)` | schema → migration SQL → apply | — | ✏️✏️ |
| `dev` / `build` / `start` / `check` | `tsx/vite/esbuild` | build chain | — | — |

### 1.2. გამოცალკევებული — `package.json`-ში არ არის, მაგრამ მნიშვნელოვანი (12+)

| ფაილი | დანიშნულება | სტატუსი |
|---|---|---|
| `apply-migration-0013.mjs` ... `0016.mjs` | Railway production migration apply scripts (CLAUDE.md golden rule-ის ნაწილი) | ✅ active, ოპერატორი ხელით უშვებს |
| `enrich-org-contacts.ts` | Google Places + website scraping → `organizations.phone/email` + provenance | ✅ ახალი, 2026-04-23 |
| `enrich-branches-places.py` | Python fallback ფილიალებისთვის | ⚠️ უცნობი სტატუსი |
| `merge-branches-to-excel.py` | Python export | ⚠️ ad-hoc |
| `check-geocoded.ts` | diagnostic — რა გეოკოდიზებულია | ✅ |
| `restore-db.ts` | sample backup restore | ⚠️ iszardebuli |
| `schema-coverage.ts`, `check-schema.ts` | schema drift detection | ✅ |
| `verify-api-keys.ts` | საცდელად გაშვება key-ების დასადასტურებლად | ✅ |
| `sync-catalog-coords.ts` | organizations ↔ grants coord sync (dupe sources) | ⚠️ historical — 558 dupe-ის წყარო |
| `translate-enriched.mjs` | enrichment batch translation | ✅ |
| `find-grant.ts`, `find-geocoded-grant.ts`, `find-bad-country-rows.mjs` | debug helpers | ✅ |

### 1.3. ისტორიული — **DO NOT TOUCH** (ქვაფენილი batch enrichment)

`stage1-*.cjs` (9 batch) + `stage2-*.cjs` (11 batch) + `stage3-*.cjs` (4) + `stage4-*.cjs` (8).
**32 ფაილი სულ.** CLAUDE.md-ში ცალსახად ნათქვამია: „**`scripts/` საქაღალდეში `stage*.cjs` ფაილებს ნუ შეეხები**". არქივი, შეცდომით წაშლა ფატალურია — აქედან წამოვიდა საწყისი 629-გრანტის იმპორტი.

### 1.4. Pending imports JSON archive (`pending-imports/`)

- `discovery-YYYY-MM-DD.json` — LLM output, შემდეგ import-new-grants-ის input
- `import-YYYY-MM-DD.mjs` — ad-hoc apply script
- `daily-discovery-run-*.md` — ოპერატორის log
- **20+ json files** 2026-04-14-იდან 2026-04-22-მდე — არქივი, არ წაშალო (audit trail)

---

## 2. 🤖 CRON / განრიგი

### 2.1. ერთადერთი active scheduler: GitHub Actions

**`.github/workflows/daily-discovery.yml`**

| ატრიბუტი | მნიშვნელობა |
|---|---|
| Trigger | `cron: '0 8 * * *'` (ყოველდღე 08:00 UTC = 12:00 თბილისის დრო) |
| Manual trigger | `workflow_dispatch` (inputs: category, country, notify) |
| Timeout | 15 წუთი |
| Node version | 22 |
| Package manager | pnpm (frozen-lockfile) |
| GitHub Secrets | `DATABASE_URL`, `ENRICHMENT_API_URL`, `ENRICHMENT_API_KEY`, `RESEND_API_KEY` |

**Pipeline:**
1. `pnpm tsx scripts/daily-discovery.ts` → JSON file ამოაგდოს `pending-imports/`-ში
2. `pnpm tsx scripts/import-new-grants.ts --file=... --notify` → DB insert + enrichment + email
3. `pnpm tsx scripts/audit-translations.ts` + `translate-missing.ts` → თარგმანების fallback
4. Summary → `$GITHUB_STEP_SUMMARY`

**ცნობილი რისკები:**
- `--notify` scheduled run-ზე **default=on** — ყოველდღე გაიგზავნება newsletter batch. თუ subscribers გაიზარდა, Resend rate limit შეიძლება დაიკარგოს (currently 100/day free tier).
- Railway DB-ს public URL secret-ში — თუ CLI-დან cycle არ მოხდა, ძველი URL-ზე წერს. Phase 2 ოპერაცია: rotate Railway MySQL credentials ყოველ 90 დღე.
- Workflow **არ ამოწმებს migration state-ს** (PR #145 incident-ი იმიტომ მოხდა). Schema ცვლილება merge-ის წინ Ilias-მა უნდა დაამატოს pre-deploy hook.

### 2.2. Railway auto-deploy (not CRON, მაგრამ scheduler-ლს ემგვანება)

- `main` branch push → auto-redeploy Railway-ზე
- ~2-3 წუთი build + restart
- **Zero downtime ცდის მცდელობა** — Railway keeps old container until new passes `/healthz`
- **არ არის daily maintenance job**

### 2.3. რა CRON-ები **არ არსებობს** (პოტენციური გაპ-ი)

- ❌ DB backup cron — Railway-ის managed backup-ზე ვყრდნობით (daily automatic, 7-day retention)
- ❌ Broken-link checker ორგანიზაციების `website` ველებისთვის
- ❌ Google Places refresh cron (place_id-ის stale data — 90+ დღე)
- ❌ Stale `grant_translations` re-check (თუ original description შეიცვალა, თარგმანი outdated-ია)

> Phase 2-ის Noa-ს deliverable: რუკის რეფრეშის/აუდიტის cron-ი — weekly, რეიტინგების ამოღება.

---

## 3. 🌐 გარე API-ები — ინტეგრაციის რუკა

### 3.1. GrantedAI API (`server/externalGrants.ts`)

| ატრიბუტი | მნიშვნელობა |
|---|---|
| Base URL | `https://api.grantedai.com/v1` |
| Auth | Bearer token (`BUILT_IN_FORGE_API_KEY`) |
| Endpoints | `/search_grants`, `/get_grant`, `/search_funders` |
| Database size | 84,000+ grants, 133,000+ US foundations |
| Consumer | Admin panel (`admin.searchExternal`, `admin.getExternalDetail`, `admin.importExternal`, `admin.searchFunders`) |
| Error handling | try/catch + empty array fallback (silent degradation) |
| Rate limit | დოკუმენტირებული არ არის — observer-ით მუშაობს |
| Test coverage | ❌ no `externalGrants.test.ts` |

**რისკი:** silent degradation (catch → empty array) პროდქოში სანახავია — თუ API დაგნდა, admin UI "0 results" აჩვენებს shortcut-ად. Phase 2-ში Ilias-მა უნდა დაამატოს monitoring.

### 3.2. Anthropic Claude API (`server/toolboxClient.ts`)

| ატრიბუტი | მნიშვნელობა |
|---|---|
| SDK | `@anthropic-ai/sdk` v0.88.0 |
| Auth | `ANTHROPIC_API_KEY` (Railway env var) |
| Model | Claude Haiku (smart search) + tool-use agentic loop |
| Consumer | `ai.grantChat` tRPC endpoint (public, no auth needed) |
| Tools available | 5: `search_grants_by_keyword`, `list_grants_by_category`, `list_grants_by_country`, `get_grant_detail`, `list_categories` |
| DB access pattern | Direct Drizzle (არა MCP toolbox production-ში) |
| Test coverage | ⚠️ partial — `grantAssistant.ts` separate logic, no end-to-end test |

**Design გადაწყვეტილება:** production-ში MCP toolbox არ იხმარება — toolboxClient.ts-ს უშუალოდ `db.ts`-ის ფუნქციები გამოაქვს. MCP მხოლოდ local development/Claude Code agent-ისთვის არის (`.mcp.json`).

### 3.3. Google Maps / Places API

| Component | Key | Used by |
|---|---|---|
| Maps JavaScript API | Browser key (HTTP referrer restricted) | Frontend `VITE_GOOGLE_MAPS_BROWSER_KEY` |
| Places API (New) | Server key `grantkit-server-geocoding-v2` (unrestricted) | `scripts/geocode-grants.ts`, `scripts/enrich-org-contacts.ts` |
| Geocoding API | იგივე server key | `scripts/geocode-grants.ts` |

**Map IDs:** `VITE_GOOGLE_MAPS_MAP_ID = 889cfa3974b93649dcc6c265`

**Critical:** Server key Railway-ზე **არ არის set** — ოპერატორი ხელით გადაიცემს როცა `geocode-grants`-ს უშვებს. Phase 2-ში Noa-ს Google Places reviews integration-მა **სერვერულ კოდზე გადავა** (scheduled enrichment), ამიტომ:
1. Railway-ზე უნდა დაემატოს `GOOGLE_MAPS_API_KEY` env var
2. Server key-ს უნდა დაემატოს IP restriction (Railway static egress IP)
3. Places API Reviews endpoint-ის quota უნდა დადასტურდეს ($17/1000 requests, 538 orgs × 1 = $9.15 initial backfill)

### 3.4. Paddle (payments)

| ატრიბუტი | მნიშვნელობა |
|---|---|
| Files | `server/paddleWebhook.ts` + tRPC `subscription.*` |
| Env vars | `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` |
| Webhook endpoint | `/api/paddle/webhook` (Express route) |
| Events handled | subscription activated / cancelled / paused / past_due / resumed |
| Side effect | Resend email + user row update |
| Test coverage | ✅ `paddleWebhook.test.ts` |

### 3.5. Resend (email)

| ატრიბუტი | მნიშვნელობა |
|---|---|
| File | `server/emailService.ts` |
| SDK | `resend` v6.9.4 |
| From address | `onboarding@resend.dev` (**NOT production-grade** — Resend test sender) |
| Env var | `RESEND_API_KEY` |
| Templates | baseTemplate() with purple brand color, 600px width, inline HTML |
| Use cases | Subscription status changes + daily grant alerts + newsletter batches |
| Free tier | 100 emails/day, 3000/month |

**Risk:** `FROM_EMAIL = "onboarding@resend.dev"` — Resend-ის default test sender. Production-ში ვერ გაიგზავნება branded email-ები მომხმარებლის inbox-ში (spam folder + "via resend.dev" badge). Phase 2-ში Ilias/Lila-ს task: verify `mail.grantkit.io` domain Resend-ში და გადართე `from: "notifications@grantkit.io"`-ზე.

**SITE_URL mismatch:** `SITE_URL = "https://grantkit-ne96tb4y.manus.space"` — Manus sandbox URL, production-ი `grantkit-production-06f7.up.railway.app`-ია. Email link-ები მკვდარ Manus URL-ზე უშვებენ მომხმარებელს.

### 3.6. OpenID / Manus OAuth

| ატრიბუტი | მნიშვნელობა |
|---|---|
| Files | `server/_core/oauth.ts` + `jose` JWT |
| Env vars | `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `JWT_SECRET`, `VITE_APP_ID` |
| Flow | OpenID authorization code → JWT session cookie |
| Dependency | Manus infrastructure — **single point of failure** |

**Risk:** Manus OAuth სერვისი საკუთარი ინფრასტრუქტურაა. თუ Manus გაითიშება, მომხმარებლის login-ი გატყდება. Phase 2-ის სკოპში არ არის, მაგრამ rode-map-ზე უნდა იყოს: მოკლე-ვადიანი fallback auth (email magic-link via Resend).

### 3.7. OpenRouter / Google AI (enrichment + translation)

| ატრიბუტი | მნიშვნელობა |
|---|---|
| Env vars | `ENRICHMENT_API_URL`, `ENRICHMENT_API_KEY` (ან legacy `BUILT_IN_FORGE_*`) |
| Auto-detect | URL-ზე `openrouter.ai` / `googleapis.com` → adapter logic |
| Models used | `google/gemini-2.0-flash-001` (enrichment) + `claude-haiku` (smart search) |
| Consumer scripts | `enrich-descriptions`, `enrich-metadata`, `daily-discovery`, `translate-missing` |
| Cost observation | ~$15 full 629-row enrichment run (2026-04-16) |

---

## 4. 🏗️ MCP Servers (`.mcp.json`)

```json
{
  "grantkit-db": { "url": "http://127.0.0.1:5000/mcp" },
  "gitnexus": { "command": "npx", "args": ["gitnexus", "mcp"] }
}
```

### 4.1. `grantkit-db` — googleapis/mcp-toolbox
- Binary: `toolbox` v0.7.0 (auto-downloaded by `scripts/start-toolbox.sh`)
- Config: `tools.yaml` (527 ხაზი)
- Connection: parse `DATABASE_URL` → MYSQL_* env vars → toolbox binary
- Tools exposed: 8 public + 8 admin (list_grants, search_grants_by_keyword, upsert_grant, execute_sql...)
- **Use case:** Claude Code agent-ი local development-ში, ინტროსპექცია production DB-ს (read-only tools)
- **არა:** production runtime (runtime-ი იყენებს `server/db.ts` direct Drizzle)

### 4.2. `gitnexus` — codebase knowledge graph
- Port 4747
- Use case: კოდბაზის symbol ძიება, dependency analysis
- Dev-only, არა production-ში

---

## 5. 🗄️ DB Migration System

### 5.1. Framework

- **Drizzle ORM** + `drizzle-kit`
- Migration folder: `drizzle/*.sql` (თანმიმდევრული numbering `0001_*.sql` ... `0016_*.sql`)
- Schema source: `drizzle/schema.ts` (single source of truth)
- Config: `drizzle.config.ts`

### 5.2. Workflow (CLAUDE.md-ის Golden Rule)

1. PR გახსენი: `schema.ts` + migration SQL + `apply-migration-XXXX.mjs` ერთ PR-ში
2. CI: `tsc --noEmit` + `vite build` + `esbuild` წარმატებით
3. **Migration Railway-ზე გაშვება:** `DATABASE_URL="..." node scripts/apply-migration-XXXX.mjs`
4. Verify: `SELECT <new-column> FROM <table> LIMIT 1`
5. **მხოლოდ ახლა merge** main-ში
6. Railway auto-deploy ~2-3 წუთი → verify `/healthz` + smoke test

### 5.3. PR #145 Incident (2026-04-22) — გახსენება

- PR merge-ი მოხდა schema-ით, migration არ იყო გაშვებული
- `db.select().from(grants)` — Drizzle SQL გენერაცია ცდილობდა ახალი სვეტებიდან SELECT
- MySQL: "Unknown column 'X' in field list"
- **ყველა გვერდი გატყდა**, production outage ~15 წუთი
- Resolution: rollback + manual apply migration + redeploy

**Phase 2-ის Ilias-ის pre-deploy hook:**
```bash
# CI-ს ნაწილი — schema-ს და DB-ის შედარება merge-ის წინ
pnpm drizzle-kit check
```

---

## 6. 🔑 Env Vars Inventory (Railway grantkit service)

| Variable | Source | Purpose |
|---|---|---|
| `DATABASE_URL` | Railway MySQL plugin auto-inject | primary DB connection |
| `NODE_ENV` | `production` | runtime switch |
| `PORT` | `8080` | Express listen port |
| `JWT_SECRET` | manual | auth token signing |
| `OAUTH_SERVER_URL` | manual | Manus OAuth endpoint |
| `OWNER_OPEN_ID` | manual | owner user ID for admin bootstrap |
| `VITE_APP_ID` | manual | OAuth client ID |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | manual | map frontend key |
| `VITE_GOOGLE_MAPS_MAP_ID` | manual (`889cfa3974b93649dcc6c265`) | custom map style ID |
| `BUILT_IN_FORGE_API_URL` | manual | GrantedAI base URL |
| `BUILT_IN_FORGE_API_KEY` | manual | GrantedAI auth |
| `ENRICHMENT_API_URL` | manual | OpenRouter/Google AI (optional override) |
| `ENRICHMENT_API_KEY` | manual | იგივე |
| `ANTHROPIC_API_KEY` | manual | Claude AI assistant |
| `PADDLE_API_KEY` | manual | payments |
| `PADDLE_WEBHOOK_SECRET` | manual | webhook signature verify |
| `RESEND_API_KEY` | manual | email |

**Phase 2-ში დასამატებელი:**
- `GOOGLE_MAPS_API_KEY` (server key) — scheduled Places reviews enrichment-ისთვის

---

## 7. 📊 Pipeline Flow Diagrams

### 7.1. Daily discovery pipeline

```
GitHub Actions CRON (08:00 UTC)
  │
  ├─→ scripts/daily-discovery.ts
  │     ├─ OpenRouter: "give me 15 grants for medical_treatment in US"
  │     ├─ DB: SELECT existing itemId-s (dedup filter)
  │     └─ WRITE pending-imports/discovery-YYYY-MM-DD.json
  │
  ├─→ scripts/import-new-grants.ts --file=... --notify
  │     ├─ READ JSON
  │     ├─ INSERT grants (skip duplicates)
  │     ├─ OpenRouter: metadata enrichment (deadline, appProcess...)
  │     ├─ OpenRouter: description enrichment (if short)
  │     ├─ OpenRouter: FR/ES/RU/KA translations
  │     └─ Resend: batch email newsletter_subscribers
  │
  └─→ scripts/translate-missing.ts (fallback)
```

### 7.2. Ad-hoc enrichment pipeline (ოპერატორი local)

```
PowerShell local terminal
  │
  ├─ export DATABASE_URL=<MYSQL_PUBLIC_URL>
  ├─ export GOOGLE_MAPS_API_KEY=<grantkit-server-geocoding-v2>
  │
  ├─→ pnpm geocode:grants:limit10  (smoke test)
  ├─→ pnpm geocode:grants          (full pass)
  ├─→ pnpm enrich:contacts         (Places phone/email)
  └─→ pnpm enrich:metadata         (deadline, age, docs)
```

### 7.3. Migration apply pipeline

```
drizzle/schema.ts modified
  │
  ├─ pnpm db:push          (local: generate migration SQL)
  ├─ git commit + push     (PR opened)
  ├─ CI green ✅
  │
  ├─→ RAILWAY-WAIT: operator runs manually:
  │     DATABASE_URL="<PUBLIC>" node scripts/apply-migration-XXXX.mjs
  ├─ verify column exists
  ├─ merge PR to main
  └─ Railway auto-redeploy (2-3 min)
```

---

## 8. 🚨 ცნობილი რისკები / Tech Debt

| # | რისკი | კრიტიკულობა | Phase 2 Owner |
|---|---|---|---|
| 1 | Resend `FROM_EMAIL = onboarding@resend.dev` (test sender) | 🔴 High | Ilias + Lila |
| 2 | `SITE_URL` email templates-ში Manus URL-ზე მიუთითებს | 🔴 High | Ilias |
| 3 | GitHub Actions workflow არ ამოწმებს migration drift-ს (PR #145 risk) | 🔴 High | Ilias |
| 4 | Google Places reviews — არ არის scheduled refresh | 🟡 Medium | Noa |
| 5 | External API (GrantedAI) — silent failure (no monitoring) | 🟡 Medium | Ilias |
| 6 | `stage*.cjs` scripts გადაფარულია — 32 ფაილი, 1 ფაილიც რომ წაიშალოს, seed data missing | 🟢 Low (read-only after run) | Tamar |
| 7 | Manus OAuth — single point of failure | 🟡 Medium | Ezra (long-term) |
| 8 | `DATABASE_URL` public URL-ი GitHub Secret-ში — cycle/rotate policy არ არის | 🟡 Medium | Ilias |
| 9 | 558 coord duplicates — `sync-catalog-coords.ts`-ს ანალიზი საჭიროა | 🟡 Medium | Tamar |
| 10 | `organization_translations` ცხრილი 0 consumer-ით — dropped safely შემდეგ migration-ში | 🟢 Low | Tamar |

---

## 9. 🎯 Phase 2-ის ინფრასტრუქტურული Deliverable-ები

### 9.1. Noa-ს (Wave 2)
- `server/placesClient.ts` — Google Places API (New) client
  - `fetchOrganizationPlaceDetails(placeId)` → rating + reviews + photos
  - `findPlaceIdByNameAndAddress(name, address)` → place_id discovery
- `scripts/enrich-places-reviews.ts` — backfill 538 orgs × N branches
- Cost estimate: ~$9 initial + $3/month steady state
- New DB columns: `organizations.google_place_id`, `organizations.google_rating`, `organization_branches.google_place_id`

### 9.2. Lila-ს (Wave 2)
- `scripts/enrich-organizations.ts` — description/mission/activities/docs AI-enrichment
- `scripts/translate-organizations.ts` — 5 ენა × 4 ველი × 538 rows = 10,760 LLM calls
- Budget: ~$30 (gemini-2.0-flash @ ~$0.30/1M output tokens)
- New DB columns: `organization_translations` **უკან აქტიურდება** (or create fresh `org_content_*` fields in main table)

### 9.3. Ilias-ის (Wave 3)
- `.github/workflows/pre-deploy-check.yml` — drizzle schema drift check
- Domain verify Resend-ზე → `mail.grantkit.io`
- `scripts/verify-production.ts` — post-deploy smoke test (15 endpoints)
- `DEPLOYMENT_PLAN.md` + `ROLLBACK_RUNBOOK.md`

---

## 10. შემდეგი ნაბიჯი

- [x] Phase D დასრულდა — ეს ფაილი
- [ ] Phase E: `CONSOLIDATION-PROPOSAL.md` (org + programs model design, migration sequence, backward-compat plan)
- [ ] Update `ORG-CENTRIC-MEMORY.md` §8 — ამ ფაილის შექმნის ფაქტი

---

*შექმნილი 2026-04-23, Hana. Phase D deliverable for Org-Centric Redesign diagnostic.*
