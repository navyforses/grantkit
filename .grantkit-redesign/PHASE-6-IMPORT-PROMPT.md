# Phase 6 — Claude Code პრომპტი: ორგანიზაციების + ფილიალების საიტზე ატვირთვა გეოლოკაციით

> **დანიშნულება:** ახალ Claude Code სესიაში ამ ფაილის შიგთავსი pomptad გადაიტანე (copy-paste). Claude Code გააკეთებს DB migration-ს, იმპორტ სკრიპტს, tRPC endpoint-ებს და რუკის UI-ს.
>
> **Input:** `data/organizations-2026-04-20.xlsx` (538 orgs, 872 branch rows — 538 HQ + 334 real branches, 90.6%-ს აქვს კოორდინატები).
>
> **Output:** DB-ში `organizations` + `organization_branches` ცხრილები + იმპორტის pipeline + Catalog გვერდზე რუკა მარკერებით.

---

## პრომპტი (ეს დააკოპირე Claude Code-ში)

```
GrantKit პროექტში გვაქვს data/organizations-2026-04-20.xlsx ფაილი — 538 ორგანიზაცია
და 872 ფილიალის row (538 HQ + 334 real branch Google Places API-დან).
ფაილი უკვე kommიტებულია branch-ში `data/organizations-export-2026-04-20`.

გინდა რომ ეს მონაცემები DB-ში ავიტვირთო და ვაჩვენო საიტზე ფილიალების რუკით.

Excel struktura — 3 sheet:

1. Organizations (538 rows):
   org_id | Organization | Description | Country | State | City | HQ Address | Website |
   Phone | Email | Latitude | Longitude | Programs Count | Branches Count | Categories |
   Service Area | Office Hours

2. Branches (872 rows):
   org_id | branch_id | Organization | Branch Type (HQ|Branch) | Country | State | City |
   Address | Phone | Email | Latitude | Longitude | Source | Notes
   — org_id-ით უკავშირდება Organizations-ს
   — თითო org-ს აქვს 1 HQ row + 0..N Branch row (Source = "Google Places")

3. Summary — სტატისტიკა (იგნორი)

ახლა შექმენი შემდეგი:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — DB schema (drizzle/schema.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

დაამატე 2 ახალი ცხრილი:

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  orgId: varchar("orgId", { length: 16 }).notNull().unique(),   // "ORG-0001"
  name: text("name").notNull(),
  description: text("description"),
  country: varchar("country", { length: 8 }).notNull(),          // ISO alpha-2
  state: varchar("state", { length: 128 }),
  city: varchar("city", { length: 128 }),
  hqAddress: varchar("hqAddress", { length: 500 }),
  website: text("website"),
  phone: varchar("phone", { length: 128 }),
  email: varchar("email", { length: 320 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  programsCount: int("programsCount").default(0).notNull(),
  branchesCount: int("branchesCount").default(1).notNull(),
  categories: text("categories"),                                 // comma-separated
  serviceArea: varchar("serviceArea", { length: 255 }),
  officeHours: varchar("officeHours", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("orgs_country_idx").on(table.country),
  index("orgs_lat_lng_idx").on(table.latitude, table.longitude),
]);

export const organizationBranches = mysqlTable("organization_branches", {
  id: int("id").autoincrement().primaryKey(),
  branchId: varchar("branchId", { length: 24 }).notNull().unique(), // "ORG-0001-B02"
  orgId: varchar("orgId", { length: 16 }).notNull(),                // FK → organizations.orgId
  branchType: mysqlEnum("branchType", ["HQ", "Branch"]).notNull(),
  country: varchar("country", { length: 8 }).notNull(),
  state: varchar("state", { length: 128 }),
  city: varchar("city", { length: 128 }),
  address: varchar("address", { length: 500 }),
  phone: varchar("phone", { length: 128 }),
  email: varchar("email", { length: 320 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  source: varchar("source", { length: 64 }),   // "Database" | "Google Places" | "Google Places (HQ)" | "Not found"
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("branches_org_idx").on(table.orgId),
  index("branches_country_idx").on(table.country),
  index("branches_lat_lng_idx").on(table.latitude, table.longitude),
]);

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export type OrganizationBranch = typeof organizationBranches.$inferSelect;
export type InsertOrganizationBranch = typeof organizationBranches.$inferInsert;

შემდეგ გაუშვი:  pnpm db:push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — Import script (scripts/import-organizations.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

შექმენი `scripts/import-organizations.ts` რომელიც:
- წაიკითხავს `data/organizations-2026-04-20.xlsx` (გამოიყენე `exceljs` npm
  პაკეტი — `pnpm add -D exceljs`)
- parse Organizations sheet → INSERT INTO organizations (ON DUPLICATE KEY UPDATE)
- parse Branches sheet → INSERT INTO organization_branches
  (ON DUPLICATE KEY UPDATE ყველა ველზე)
- ENV: `DATABASE_URL` (MYSQL_PUBLIC_URL Railway-დან — იხ.
  `.grantkit-redesign/OPS.md`)
- CLI flags: `--dry-run` (სრული parse + SELECT count შემოწმება, no writes),
  `--verbose` (row-by-row log)
- Batch size: 100 რიგი per INSERT
- Transaction per sheet (roll back on any error)
- Final report: inserted/updated/skipped count + HQ vs Branch breakdown
- გაუშვი smoke test: `pnpm tsx scripts/import-organizations.ts --dry-run`
  და დარწმუნდი რომ count matches: 538 orgs + 872 branches
- რეალური იმპორტი: `pnpm tsx scripts/import-organizations.ts`

დაამატე `package.json`-ში:
  "import:organizations": "tsx scripts/import-organizations.ts",
  "import:organizations:dry": "tsx scripts/import-organizations.ts --dry-run"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — tRPC endpoints (server/routers.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

დაამატე ახალი `organizations` namespace `appRouter`-ში:

organizations.list → publicProcedure, შეუძლია ფილტრაცია:
  - country? (ISO alpha-2)
  - search? (text search name + description)
  - bounds? (swLat, swLng, neLat, neLng — რუკის viewport)
  - limit (default 100, max 500)
  - offset (default 0)
  → [{ orgId, name, country, city, latitude, longitude, branchesCount, categories }]

organizations.detail → publicProcedure, input: orgId
  → { organization, branches: [] }

organizations.mapPoints → publicProcedure, input: bounds + country?
  → [{ branchId, orgId, name, branchType, latitude, longitude, country }]
  — მხოლოდ ფილიალები რომლებსაც აქვთ lat/lng (WHERE latitude IS NOT NULL)
  — გამოიყენება რუკის მარკერებისთვის

ყველა query უნდა გააკეთოს Drizzle-ით, `getDb()`-დან.
გამოიყენე `server/db.ts` pattern რომ არის სხვა query-ებისთვის.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — UI: Organizations Catalog გვერდი რუკით
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

შექმენი `client/src/pages/Organizations.tsx`:
- Split view: მარცხნივ list (cards), მარჯვნივ Google Maps
- Map: @vis.gl/react-google-maps (ან უკვე გამოყენებული რომელიც არის)
- VITE_GOOGLE_MAPS_BROWSER_KEY + VITE_GOOGLE_MAPS_MAP_ID უკვე Railway-ზე
- Marker clustering 50+ point-ზე (gmp-advanced-marker + supercluster)
- Different marker colors:
  • HQ = 🔵 ლურჯი (#1F4E78)
  • Branch = 🟢 მწვანე (#22C55E)
- Marker click → InfoWindow: org name, address, phone, "View details"
  link (opens /organizations/:orgId)
- Viewport debouncing: map bounds change → refetch `organizations.mapPoints`
  400ms debounce
- Filters: country dropdown + search input + category checkboxes
- Loading skeleton + empty state

შექმენი `client/src/pages/OrganizationDetail.tsx`:
- Header: name, country, categories, website link
- HQ info card: address, phone, email
- Branches section: list all branches with mini-map per branch
- Related grants: query `grants` table WHERE organization LIKE name (fuzzy)

Router-ში (`client/src/main.tsx` ან `App.tsx`):
  /organizations       → Organizations.tsx
  /organizations/:orgId → OrganizationDetail.tsx

Navbar-ში დაამატე "Organizations" link (ყველა 5 ენაზე):
  en: "Organizations"
  fr: "Organisations"
  es: "Organizaciones"
  ru: "Организации"
  ka: "ორგანიზაციები"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — i18n keys
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

დაამატე ყველა 5 ენის (en/fr/es/ru/ka) ფაილში:

organizations: {
  title: "Organizations",                   // ყველაზე შესაბამის ენაზე
  subtitle: "...",
  searchPlaceholder: "Search organizations...",
  filters: { country, category, hasLocation },
  mapLegend: { hq: "Headquarters", branch: "Branch" },
  detail: { branches, relatedGrants, contact, visitWebsite, viewOnMap },
  empty: "No organizations match your filters.",
  loading: "Loading organizations..."
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — Sanity checks + commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. `pnpm check` — TypeScript 0 errors
2. `pnpm test` — ყველა ტესტი passes
3. `pnpm build` — წარმატებული Vite + esbuild bundle
4. Smoke test:
   - Start dev: `pnpm dev`
   - ნავიგაცია /organizations-ზე → რუკა ხილულია, markers იხატება
   - დააჭირე რომელიმე HQ marker-ს → InfoWindow ჩანს
   - დააჭირე "View details" → /organizations/ORG-XXXX იხსნება
   - შეამოწმე branches ჩანრჩა
5. Commit:
   git add drizzle/schema.ts drizzle/ scripts/import-organizations.ts \
           server/routers.ts server/db.ts \
           client/src/pages/Organizations.tsx \
           client/src/pages/OrganizationDetail.tsx \
           client/src/i18n/ package.json
   git commit -m "feat(organizations): add org+branch catalog with map UI

   - organizations + organization_branches tables
   - import script for 538 orgs / 872 branches (872 geocoded rows, 90.6%)
   - tRPC organizations.list/detail/mapPoints endpoints
   - /organizations page with Google Maps + marker clustering
   - i18n en/fr/es/ru/ka
   "

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
მნიშვნელოვანი წესები
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- **Package manager:** მხოლოდ `pnpm`
- **tRPC URL:** `"/api/trpc"` relative — არ შეცვალო
- **DATABASE_URL:** local-ზე MYSQL_PUBLIC_URL Railway-დან; prod-ზე
  DATABASE_URL Railway-ი ავტომატურად ადგენს
- **Ops runbook:** წაიკითხე `.grantkit-redesign/OPS.md` — Google Maps
  server key + MySQL public URL უკვე არსებობს, არ შექმნა ხელახლა
- **Source ENV var:** კოდში გამოიყენე `server/_core/env.ts`-დან `ENV`
  object, პირდაპირ `process.env` არ გამოიყენო
- **Vite build:** არაფერი ახალი `VITE_*` env var არ დაამატო — Google
  Maps API keys უკვე Railway-ზე + Dockerfile ARG/ENV-ში გახვრიტა

დაიწყე STEP 1-დან და მოახსენე რა გააკეთე ყოველი step-ის შემდეგ.
```

---

## როდესაც პრომპტი გაუშვი — შემდეგი ოპერატორის todo:

1. ახალ Claude Code სესია გახსენი **გრანდკიტი-ის root-ში**
2. ზემოთ კოდ-ბლოკი დააკოპირე და გადააგდე input-ში
3. Claude Code ეტაპობრივად მოგიყვება — დაუდასტურე `pnpm db:push` რეალურ
   DB-ზე
4. Dry-run + smoke test გაიარე
5. Commit

## ჯგუფური დრო (ესტიმატი)

| Step | დრო |
|------|-----|
| 1. Schema + `db:push` | ~10 წთ |
| 2. Import script + dry-run + real run | ~30 წთ |
| 3. tRPC endpoints | ~20 წთ |
| 4. UI (Organizations + Detail) | ~60-90 წთ |
| 5. i18n 5 ენა | ~15 წთ |
| 6. Sanity + commit | ~15 წთ |
| **სულ** | **~2.5-3 სთ** |
