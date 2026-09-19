# GrantKit — Claude Code Context

ეს ფაილი ყოველ სესიაში იკითხება. **ყოველთვის** გაითვალისწინე ამ ფაილის შინაარსი სანამ რაიმე ცვლილებას გააკეთებ.

> ეს ფაილი მხოლოდ **წესებსა და პოინტერებს** შეიცავს. რიცხვები (გრანტები, ორგანიზაციები, migration-ის სტატუსი), route-ები, tRPC endpoint-ები და ფაზის პროგრესი აქ **არ** იწერება — მათი ერთადერთი წყაროა `.grantkit-redesign/PROJECT_MAP.md` (რუკა + Session Log) და `.grantkit-redesign/PIVOT.md` (სტრატეგია + ფაზა).

---

## 🧭 #0 ფილტრი — `.grantkit-redesign/KARPATHY_GUIDELINES.md`

**ნებისმიერი AI (Claude Code, Cowork, სხვა agent), რომელიც ამ პროექტზე მუშაობს — პირველ რიგში ამ ფაილს კითხულობს.** ეს არის ქცევის სტანდარტი, საწყისი ფილტრი ნებისმიერი ცვლილებისთვის.

👉 **[`.grantkit-redesign/KARPATHY_GUIDELINES.md`](.grantkit-redesign/KARPATHY_GUIDELINES.md)**

ოთხი პრინციპი (Andrej Karpathy-ის დაკვირვებებიდან, წყარო: [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)):

1. **Think Before Coding** — ვარაუდები ცალსახად, დაბნეულობა — კითხვით, არა გამოცნობით
2. **Simplicity First** — მინიმალური კოდი მოთხოვნისთვის. არანაირი სპეკულატიური feature
3. **Surgical Changes** — მხოლოდ ის რაც აუცილებელია. ყოველი შეცვლილი ხაზი უნდა მიდიოდეს მოთხოვნამდე
4. **Goal-Driven Execution** — წარმატების კრიტერიუმი + ციკლი სანამ არ გადამოწმდება

**წაკითხვის რიგი ყოველი სესიის დასაწყისში:** `KARPATHY_GUIDELINES.md` → `CLAUDE.md` → `PROJECT_MAP.md` → `OPS.md` → `PIVOT.md`

---

## 🧭 მიმდინარე სტრატეგია — `.grantkit-redesign/PIVOT.md`

**GrantKit გადადის ემიგრანტების ინტეგრაციის მხარდაჭერის პლატფორმაზე** (გადაწყვეტილება 2026-04-23, გეგმა 2026-09-18, PR #247).

👉 **[`.grantkit-redesign/PIVOT.md`](.grantkit-redesign/PIVOT.md)** — განმარტება, პოზიციონირება, მიმდინარე ფაზა, მფლობელის გადაწყვეტილებების ჟურნალი, ოპერატორის P0 სია, აგენტის პროტოკოლი.
👉 **[`.grantkit-redesign/integration-pivot/00-MASTER-PLAN.md`](.grantkit-redesign/integration-pivot/00-MASTER-PLAN.md)** — სრული გეგმა: დიაგნოსტიკა, gap analysis, 5 ფაზა „done when" კრიტერიუმებით, აგენტების გუნდი (§6), KPI, მფლობელის გადაწყვეტილებები (§8), უახლოესი 7 დღე (§9). სპეციალისტების ანგარიშები: `integration-pivot/01–07`.

**წესი:** pivot-თან დაკავშირებული ნებისმიერი სამუშაო იწყება `PIVOT.md` §3 (სად ვართ) და MASTER-PLAN §5 (ფაზის ცხრილი) წაკითხვით. ახალი feature, რომელიც გეგმის არცერთ item-ს არ ეკუთვნის — ჯერ მფლობელს ეკითხება.

---

## 🛑 READ THIS FIRST — `.grantkit-redesign/PROJECT_MAP.md`

**ყოველი სესიის პირველი მოქმედება:** გახსენი და სრულად წაიკითხე

👉 **[`.grantkit-redesign/PROJECT_MAP.md`](.grantkit-redesign/PROJECT_MAP.md)**

ეს არის პროექტის ცოცხალი რუკა — ყველა route, DB ცხრილი, API, ინფრასტრუქტურა, მიმდინარე სტატუსი, frozen / legacy ფაილების სია. ყველაფერი ერთ ადგილას.

**წესი:**
- სანამ setup/API key/env var-ს ითხოვ მომხმარებლისგან → PROJECT_MAP.md + OPS.md grep უნდა გააკეთო
- სანამ schema.ts-ს შეეხები → PROJECT_MAP.md-ში „Migration golden rule"
- სანამ PR გახსნი → PROJECT_MAP.md-ის „Constraints" სექცია
- სანამ ფაილს შეცვლი → PROJECT_MAP.md-ის „Frozen / Legacy" სია

**თუ PROJECT_MAP.md არ წავიკითხე ამ სესიის დასაწყისში — ცდის არცერთი მოქმედება არ არის სანდო.**

გუნდი (persona-ები = Claude Code სესიები) და ვინ რას ფლობს: `.grantkit-redesign/TEAM_ROSTER.md`. სესიის პროტოკოლი: `.grantkit-redesign/WORKFLOW.md`. ისტორიული დოკუმენტები (2026-04/05): `_archive/grantkit-redesign/` — მხოლოდ საცნობაროდ, დაგეგმვისთვის არა.

---

## 🚫 DO NOT TOUCH — ფაილები რომლებსაც არ შეეხო

ამ წუთისთვის **არც ერთი** ფაილი არ არის გაყინული.

> **ისტორიული შენიშვნა:** `client/src/pages/Catalog.tsx` 2026-04-22-ზე
> გაყინვისთვის იყო მონიშნული (commit `110055c`), მაგრამ შემდეგი
> კვირების მანძილზე 5 commit-მა შეცვალა (catalog list, map filter, city
> dropdown და სხვ.). რეალური workflow აჩვენებს, რომ ფაილი ცოცხალი
> კოდია, არა frozen artifact — ამიტომ freeze მოიხსნა (audit PR #194).
> თუ მომავალში ისევ საჭირო გახდეს freeze — ცალკე commit-ით დაამატე
> აქ ცხადი reason-ით.

**წესი დარჩენილი:** თუ უცნაური ხარ ფაილი გაყინულია თუ არა — შეამოწმე
ეს სია ჯერ. ცარიელი ნიშნავს რომ ნებისმიერი ფაილი ცვლადია (ჩვეული code
review და test გარდა, რა თქმა უნდა).

---

## 🗄️ DB Migration-ების ოქროს წესი — ჯერ ბაზა, მერე კოდი

**არასდროს გააერთიანო (merge) PR, რომელიც `drizzle/schema.ts`-ს ცვლის, სანამ მისი migration SQL Railway-ის MySQL-ზე არ გაიშვა.**

2026-04-22-ზე ამ წესის დარღვევამ production გააჩერა (PR #145) — კოდი ცდილობდა SELECT-ის ახალი სვეტებიდან, ბაზას არ ჰქონდა და ყველა გვერდი გატყდა.

### სწორი რიგი

1. **PR გახსენი** schema + migration SQL + apply script-ით (ერთ PR-ში ყოველთვის)
2. **CI გაიაროს** TypeScript + build ✓
3. **Migration გაიშვას Railway-ზე:** `DATABASE_URL="..." node scripts/apply-migration-XXXX.mjs`
4. **შემოწმდეს რომ სვეტები დაემატა:** `SELECT <new-column> FROM <table> LIMIT 1`
5. **მხოლოდ ამის შემდეგ merge-ი main-ში**
6. **Railway auto-deploy-ს დაელოდე** (~2-3 წუთი) + შეამოწმე ცოცხალ URL-ზე

### თუ აგრესიული refactor/რი-ცვლილება შემოდის კოდში schema-სთან ერთად

- **შექმენი ცალკე PR** მხოლოდ schema-სთვის (migration-ითურთ)
- გააერთიანე ჯერ ის + გაუშვი migration
- **შემდეგ** PR კოდის ცვლილებისთვის — ის უკვე უსაფრთხოა

### Drizzle-ის `db.select()` — რატომ საშიში

Drizzle გენერირებს SQL-ს schema.ts-ის კოლონების მიხედვით. თუ schema-ში დაამატე ახალი სვეტი, მაგრამ DB-ში არ არის — `db.select().from(table)` **მარცხდება** MySQL "Unknown column" შეცდომით. ეს აფუჭებს ყველა query-ს ამ ცხრილზე.

---

## Deployment — ყველაზე მნიშვნელოვანი

**Railway** — ერთი სერვისი, ერთი URL:

- Backend (Express + tRPC) + Frontend (React SPA) → ერთ Railway სერვისზე
- MySQL → Railway MySQL plugin, **იმავე** Railway პროექტში
- URL: `https://grantkit-production-06f7.up.railway.app`

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

**რა არის:** ემიგრანტების ინტეგრაციის ნავიგატორი — ორგანიზაციების, პროცედურებისა და დახმარების კატალოგი მომხმარებლის ენაზე; განმარტება, პოზიციონირება და მოდელი → `.grantkit-redesign/PIVOT.md`. მიმდინარე რიცხვები → `.grantkit-redesign/PROJECT_MAP.md`.

**ენები:** ინგლისური, ფრანგული, ესპანური, რუსული, ქართული (5 ენა)

---

## Tech Stack

| ფენა | ტექნოლოგია |
|------|-----------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4 |
| UI | Radix UI, Framer Motion |
| Backend | Node.js, Express 5, tRPC 11 |
| Database | MySQL + Drizzle ORM |
| Auth | Email/password — JWT cookie (jose) |
| Payments | Paddle |
| Email | Resend |
| Package Manager | **pnpm** (არ გამოიყენო npm ან yarn) |
| Runtime | Node.js 22, tsx |

---

## პროექტის სტრუქტურა

```
grantkit/
├── client/src/
│   ├── pages/          # Home, Catalog, OrganizationDetail, Dashboard, Admin,
│   │                   # AiAssistant, Profile, Login, Contact, Analytics...
│   ├── components/     # Navbar, FilterBar, CatalogCard, AIChatBox...
│   ├── contexts/       # LanguageContext (i18n)
│   ├── i18n/           # en.ts, fr.ts, es.ts, ru.ts, ka.ts
│   └── main.tsx        # tRPC client setup (url: "/api/trpc" — სწორია)
├── server/
│   ├── _core/
│   │   ├── index.ts    # Express server entry point
│   │   ├── trpc.ts     # publicProcedure, protectedProcedure, adminProcedure
│   │   └── env.ts      # ENV object (ყველა env var აქედან)
│   ├── routers.ts      # ყველა tRPC endpoint (სია: PROJECT_MAP.md §tRPC)
│   ├── db.ts           # Drizzle ORM queries
│   ├── externalGrants.ts  # GrantedAI API (searchExternalGrants, getExternalGrantDetail)
│   ├── emailService.ts    # Resend email notifications
│   ├── toolboxClient.ts   # AI assistant — direct Drizzle queries (no MCP needed)
│   └── importGrants.ts    # CSV/Excel bulk import
├── drizzle/
│   └── schema.ts       # MySQL ცხრილები (სია: PROJECT_MAP.md §Database)
├── scripts/
│   ├── enrich-descriptions.ts  # GrantedAI-ს გამოყენება description-ების შესავსებად
│   ├── start-toolbox.sh        # googleapis/mcp-toolbox სერვერის გაშვება
│   └── [stage*.cjs]            # ისტორიული enrichment სკრიპტები (არ შეეხო)
├── _archive/           # ისტორიული დოკუმენტები / სკრიპტები / Manus მოდულები (მხოლოდ საცნობაროდ)
├── tools.yaml          # googleapis/mcp-toolbox კონფიგი (MySQL → MCP tools)
├── .mcp.json           # Claude Code MCP სერვერები
├── vercel.json         # Vercel frontend კონფიგი (secondary)
└── Dockerfile          # Multi-stage production build
```

---

## Database

**Schema:** `drizzle/schema.ts`. ცხრილების სია, სვეტები და migration-ების სტატუსი → `.grantkit-redesign/PROJECT_MAP.md` §Database (აქ არ დუბლირდება).

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
| GrantedAI | `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` | გარე grant-ების ძიება (`externalGrants.ts`) |
| Paddle | `PADDLE_API_KEY` + `PADDLE_WEBHOOK_SECRET` | Subscription payments |
| Resend | `RESEND_API_KEY` | Email notifications |
| Auth | `JWT_SECRET` | Email/password login → JWT cookie |
| Anthropic | `ANTHROPIC_API_KEY` | AI assistant, smart search |
| Google Maps / Places | `VITE_GOOGLE_MAPS_BROWSER_KEY` (browser), `GOOGLE_MAPS_API_KEY` (server, local only) | რუკა, geocoding, enrichment — დეტალი `OPS.md` |

**GrantedAI API** (`server/externalGrants.ts`):
- `searchExternalGrants()` → `POST /v1/search_grants`
- `getExternalGrantDetail()` → `POST /v1/get_grant`
- `searchExternalFunders()` → `POST /v1/search_funders`
- tRPC routes: `admin.searchExternal`, `admin.getExternalDetail`, `admin.importExternal`, `admin.searchFunders`

---

## tRPC API

ყველა endpoint `server/routers.ts`-შია. **სია აქ არ იწერება** — მიმდინარე router-ების და procedure-ების ცხრილი: `.grantkit-redesign/PROJECT_MAP.md` §tRPC API Endpoints (ცვლილებისას იქ განაახლე).

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
pnpm discovery                 # ყოველდღიური LLM discovery → pending-imports/ (GitHub Action 08:00 UTC)
pnpm import:grants -- --file=pending-imports/discovery-YYYY-MM-DD.json [--notify]
pnpm audit:db                  # DB content audit (რიცხვების წყარო PROJECT_MAP-ისთვის)
```

სრული სია (geocode, import:france, enrich:contacts, audit:*, fix:*): `package.json` → `scripts`; სკრიპტების აღწერა: `PROJECT_MAP.md` §Scripts.

---

## Railway Environment Variables

Railway Dashboard-ზე დაყენებული უნდა იყოს (სახელები; მნიშვნელობები არასდროს დოკუმენტში):
```
DATABASE_URL          ← Railway-ი ავტომატურად ამატებს MySQL plugin-დან
NODE_ENV=production
PORT=8080
JWT_SECRET
ANTHROPIC_API_KEY
BUILT_IN_FORGE_API_URL
BUILT_IN_FORGE_API_KEY
PADDLE_API_KEY
PADDLE_WEBHOOK_SECRET
RESEND_API_KEY
VITE_GOOGLE_MAPS_BROWSER_KEY
VITE_GOOGLE_MAPS_MAP_ID
```

რომელი რეალურად არის დაყენებული და როგორ ბრუნავს — `.grantkit-redesign/OPS.md` (Credentials Inventory, Secret rotation).

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
9. **Ops runbook:** სანამ ოპერატორს (მომხმარებელს) API key შექმნის / Railway env var-ის დაყენების / ნებისმიერი setup task-ის გაკეთებას სთხოვ — **ჯერ წაიკითხე `.grantkit-redesign/OPS.md`**. იქ ჩაწერილია რა უკვე არსებობს (server-side Google Maps key, MySQL public URL და ა.შ.) რომ იგივე სამუშაო ორჯერ არ გაკეთდეს.
10. **PR ზომა და რიგი:** ≤ 300 შეცვლილი ხაზი, ერთი concern; schema PR ყოველთვის ცალკე და migration-ის შემდეგ merge; „refactor while here" აკრძალულია; ≤ 3 ღია PR. დეტალი: `WORKFLOW.md`.
11. **No-monetization zone:** პარტნიორის/Pro/ფასიანი CTA-ს ნებისმიერი რენდერი `server/offers/placement.ts` + `content/offers-allowlist.json`-ზე გადის; „არასდროს" ტესტების გარეშე მონეტიზაციის PR არ merge-დება. სია: `PIVOT.md` §6 წესი 4.
12. **სესიის ბოლოს:** `PROJECT_MAP.md` Session Log 3 ხაზი (+ `PIVOT.md` §3, თუ ფაზა/ბლოკერი შეიცვალა). რიცხვები ხელით არ იწერება — `pnpm audit:db` / `STATUS.json`.
