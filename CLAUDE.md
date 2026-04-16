# GrantKit — Claude Code Context

ეს ფაილი ყოველ სესიაში იკითხება. **ყოველთვის** გაითვალისწინე ამ ფაილის შინაარსი სანამ რაიმე ცვლილებას გააკეთებ.

---

## Deployment — ყველაზე მნიშვნელოვანი

**Railway** — ერთი სერვისი, ერთი URL:

- Backend (Express + tRPC) + Frontend (React SPA) → ერთ Railway სერვისზე
- MySQL → Railway MySQL plugin, **იმავე** Railway პროექტში
- URL: `https://grantkit-production-06f7up.railway.app`

**Vercel** — **გამოიყენება ᲛᲮᲝᲚᲝᲓ FRONTEND-ისთვის** (სარეზერვო / staging):
- `vercel.json` არსებობს კოდში მაგრამ **Railway არის primary deployment**
- `/api/trpc` — **relative URL არის სწორი** — backend და frontend ერთ სერვისზეა

**არ გამოიყენება:**
- ~~Render~~ (`render.yaml` წაშლილია)
- ~~VPS / სხვა hosting~~

> **შეცდომა რომ არ დაუშვა:** არ შეეხო `/api/trpc` URL-ს `main.tsx`-ში. ის სწორია.
> **არ** ჩაამატო `VITE_API_URL` ან cross-origin კონფიგურაცია — არ სჭირდება.

---

## პროექტი

**რა არის:** 643+ grant-ის კატალოგი — სამედიცინო, საგანმანათლებლო, საბინაო და სხვა დახმარებები 29 ქვეყნიდან. Subscription-based SaaS.

**ენები:** ინგლისური, ფრანგული, ესპანური, რუსული, ქართული (5 ენა)

---

## Tech Stack

| ფენა | ტექნოლოგია |
|------|-----------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4 |
| UI | Radix UI, Framer Motion |
| Backend | Node.js, Express, tRPC 11 |
| Database | MySQL + Drizzle ORM |
| Auth | OpenID / JWT (jose) — Manus OAuth სერვერი |
| Payments | Paddle |
| Email | Resend |
| Package Manager | **pnpm** (არ გამოიყენო npm ან yarn) |
| Runtime | Node.js 22, tsx |

---

## პროექტის სტრუქტურა

```
grantkit/
├── client/src/
│   ├── pages/          # Home, Catalog, GrantDetail, Dashboard, Admin,
│   │                   # AiAssistant, Profile, Login, Contact, Analytics...
│   ├── components/     # Navbar, FilterBar, CatalogCard, AIChatBox...
│   ├── contexts/       # LanguageContext (i18n)
│   ├── i18n/           # en.ts, fr.ts, es.ts, ru.ts, ka.ts
│   └── main.tsx        # tRPC client setup (url: "/api/trpc" — სწორია)
├── server/
│   ├── _core/
│   │   ├── index.ts    # Express server entry point
│   │   ├── trpc.ts     # publicProcedure, protectedProcedure, adminProcedure
│   │   ├── env.ts      # ENV object (ყველა env var აქედან)
│   │   └── oauth.ts    # OAuth routes
│   ├── routers.ts      # ყველა tRPC endpoint (~960 ხაზი)
│   ├── db.ts           # Drizzle ORM queries
│   ├── externalGrants.ts  # GrantedAI API (searchExternalGrants, getExternalGrantDetail)
│   ├── emailService.ts    # Resend email notifications
│   ├── toolboxClient.ts   # AI assistant — direct Drizzle queries (no MCP needed)
│   └── importGrants.ts    # CSV/Excel bulk import
├── drizzle/
│   └── schema.ts       # MySQL tables: users, grants, grantTranslations,
│                       #   savedGrants, newsletterSubscribers, notificationHistory
├── scripts/
│   ├── enrich-descriptions.ts  # GrantedAI-ს გამოყენება description-ების შესავსებად
│   ├── start-toolbox.sh        # googleapis/mcp-toolbox სერვერის გაშვება
│   └── [stage*.cjs]            # ისტორიული enrichment სკრიპტები (არ შეეხო)
├── tools.yaml          # googleapis/mcp-toolbox კონფიგი (MySQL → MCP tools)
├── .mcp.json           # Claude Code MCP სერვერები
├── vercel.json         # Vercel frontend კონფიგი (secondary)
└── Dockerfile          # Multi-stage production build
```

---

## Database

**Schema** (`drizzle/schema.ts`):
- `users` — auth, Paddle subscription fields, role (user/admin)
- `grants` — კატალოგი (itemId unique slug, category, country, isActive...)
- `grantTranslations` — multilingual content (en/fr/es/ru/ka)
- `savedGrants` — user bookmarks
- `newsletterSubscribers` — email list
- `notificationHistory` — sent email campaigns

**Commands:**
```bash
pnpm db:push          # schema generate + migrate
```

**ORM pattern:** Drizzle, direct SQL-style queries. `getDb()` lazy-initializes connection.

---

## MCP სერვერები (`.mcp.json`)

### `grantkit-db` — googleapis/mcp-toolbox
- **გაშვება:** `pnpm toolbox:start` (ან `bash scripts/start-toolbox.sh`)
- **Endpoint:** `http://127.0.0.1:5000/mcp`
- **Requires:** `DATABASE_URL` env var
- **Tools** (`tools.yaml`):
  - Public: `list_grants`, `search_grants_by_keyword`, `list_grants_by_category`, `list_grants_by_country`, `get_grant_detail`, `list_categories`, `list_countries`
  - Admin: + `upsert_grant`, `update_grant_*`, `deactivate_grant`, `reactivate_grant`, `grant_database_stats`, `list_tables`, `execute_sql`

### `gitnexus` — კოდის knowledge graph
- **გაშვება:** `pnpm gitnexus:serve` (port 4747)
- **Analyze:** `pnpm gitnexus:analyze`
- **გამოყენება:** კოდბაზის ძიება, dependency analysis

---

## გარე API-ები

| სერვისი | ENV | გამოყენება |
|---------|-----|-----------|
| GrantedAI | `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` | 84,000+ grant ძიება (`externalGrants.ts`) |
| Paddle | `PADDLE_API_KEY` + `PADDLE_WEBHOOK_SECRET` | Subscription payments |
| Resend | `RESEND_API_KEY` | Email notifications |
| Manus OAuth | `OAUTH_SERVER_URL` + `OWNER_OPEN_ID` + `JWT_SECRET` | Auth |

**GrantedAI API** (`server/externalGrants.ts`):
- `searchExternalGrants()` → `POST /v1/search_grants`
- `getExternalGrantDetail()` → `POST /v1/get_grant`
- `searchExternalFunders()` → `POST /v1/search_funders`
- tRPC routes: `admin.searchExternal`, `admin.getExternalDetail`, `admin.importExternal`, `admin.searchFunders`

---

## tRPC API სტრუქტურა (`server/routers.ts`)

```
auth.me / auth.logout
catalog.list / catalog.detail / catalog.count / catalog.preview / catalog.states / catalog.cities
grants.savedList / grants.toggleSave / grants.exportSaved (TODO)
newsletter.subscribe / newsletter.unsubscribe
subscription.status / subscription.cancel / subscription.activate
admin.stats / admin.grants / admin.users / admin.updateRole / admin.updateSubscription
admin.createGrant / admin.updateGrant / admin.deleteGrant / admin.hardDeleteGrant
admin.parseImport / admin.executeImport
admin.searchExternal / admin.getExternalDetail / admin.importExternal / admin.searchFunders
ai.grantChat
```

---

## Scripts

```bash
pnpm dev                       # development server (tsx watch)
pnpm build                     # vite build + esbuild server bundle
pnpm start                     # production (node dist/index.js)
pnpm check                     # TypeScript check
pnpm test                      # vitest
pnpm db:push                   # schema migrate
pnpm toolbox:start             # grantkit-db MCP სერვერი
pnpm gitnexus:analyze          # კოდბაზის ანალიზი
pnpm gitnexus:serve            # gitnexus MCP სერვერი
pnpm enrich:descriptions       # GrantedAI-ით description-ების შევსება
pnpm enrich:descriptions:dry   # dry-run (DB-ს არ ცვლის)
pnpm enrich:metadata           # enriched ველების შევსება (deadline, appProcess...)
pnpm enrich:metadata:dry       # dry-run (DB-ს არ ცვლის)
pnpm translate:audit           # თარგმანების coverage აუდიტი
pnpm translate:missing         # აკლია თარგმანების შევსება
```

---

## Railway Environment Variables

Railway Dashboard-ზე დაყენებული უნდა იყოს:
```
DATABASE_URL          ← Railway-ი ავტომატურად ამატებს MySQL plugin-დან
NODE_ENV=production
PORT=8080
JWT_SECRET
OAUTH_SERVER_URL
OWNER_OPEN_ID
VITE_APP_ID
BUILT_IN_FORGE_API_URL
BUILT_IN_FORGE_API_KEY
PADDLE_API_KEY
PADDLE_WEBHOOK_SECRET
RESEND_API_KEY
```

---

## მნიშვნელოვანი წესები

1. **Package manager:** ყოველთვის `pnpm`, არასდროს `npm install` ან `yarn`
2. **tRPC URL:** `"/api/trpc"` — relative, სწორია, **არ შეცვალო**
3. **ENV vars:** ყოველთვის `server/_core/env.ts`-ში `ENV` object-იდან გამოიყენე
4. **DB:** `server/db.ts`-დან `getDb()` async function, lazy initialization
5. **Admin tools:** `adminProcedure` middleware ამოწმებს `role === "admin"`
6. **Soft delete:** grants-ს არასდროს hard delete — `isActive = 0` (გარდა `admin.hardDeleteGrant`)
7. **i18n:** ახალი UI ტექსტი ყველა 5 ენაში უნდა დაემატოს (`client/src/i18n/`)
8. **Scripts:** `scripts/` საქაღალდეში `stage*.cjs` ფაილებს **ნუ შეეხები** — ისტორიული მონაცემთა enrichment სკრიპტებია

---

## 5-ფაზიანი განვითარების გეგმა — პროგრესი

> ბოლო განახლება: 2026-04-15 (Phase 3 აუდიტი დასრულდა)

### ფაზა 0: გაწმენდა + Deploy Fix ✅
- ✅ `package.json` merge conflict გამოსწორდა (commit `5137dab`)
- ✅ Vercel deploy გამოსწორდა (PR #69)
- ✅ Root artifacts გაწმენდილია → `_archive/`
- ✅ Railway deploy fix (PR #70): `railway.toml`, `/healthz`, resilient CMD, `static.ts` diagnostics

### ფაზა 1: Onboarding + Dashboard + Smart Search ✅
- ✅ Onboarding 3-step flow (StepCountry, StepPurpose, StepNeeds)
- ✅ პერსონალიზებული Dashboard (funding + needs sections)
- ✅ Smart Search (Claude Haiku + MySQL fallback, 5 ენა)
- ✅ i18n — profile + country + smartSearch keys ყველა ენაში
- ✅ DB migration `drizzle/0009_user_profile.sql`
- ✅ Supabase SQL `supabase/smart-search-and-tags.sql`

### ფაზა 2: თარგმანების დასრულება ✅
- ✅ `scripts/audit-translations.ts` შექმნილია
- ✅ `scripts/translate-missing.ts` შექმნილია (Forge API / Gemini 2.5-flash)
- ✅ UI strings — 100% coverage ყველა 5 ენაში
- ✅ DB translations — 629/629 გრანტი, 4 ენა (FR/ES/RU/KA) — **100%**

### ფაზა 3: მონაცემთა გამდიდრება — მიმდინარე
> აუდიტი: 2026-04-15 (Railway DB console-იდან)

**Core fields — სტატუსი:**
- ✅ category — 629/629 (100%)
- ✅ country — 629/629 (100%)
- ✅ eligibility — 629/629 (100%)
- ✅ description (არსებობა) — 629/629 (100%)
- ⚠️ description (< 50 სიმბოლო) — **349/629 მოკლეა (55%)** → `pnpm enrich:descriptions`

**Enriched fields — ცარიელია:**
- ❌ deadline — 0/629
- ❌ applicationProcess — 0/629
- ❌ targetDiagnosis — 0/629
- ❌ ageRange — 0/629
- ❌ geographicScope — 0/629
- ❌ documentsRequired — 0/629
- → `pnpm enrich:metadata` (სკრიპტი: `scripts/enrich-metadata.ts`)

**გასაკეთებელი:**
1. Railway Variables-ში დაამატე: `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`
2. `railway run pnpm enrich:descriptions` — მოკლე description-ების გამდიდრება
3. `railway run pnpm enrich:metadata` — enriched ველების შევსება
4. საბოლოო აუდიტი Railway DB console-იდან

### ფაზა 4: Daily Discovery Routine
- ❌ **არ დაწყებულა**
- ყოველდღიური ავტომატური გრანტების მოძიება

### შემდეგი ნაბიჯი
**ფაზა 3 დასასრულებლად:** `railway run pnpm enrich:descriptions` + `railway run pnpm enrich:metadata`
**ფაზა 4 დასაწყებად:** ყოველდღიური გრანტების მოძიების ავტომატიზაცია
