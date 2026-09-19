# Supabase Inventory — 2026-04-20

Gathered during Phase R1.1 reconnaissance. **No live DB queries made —
all information is from static source files only.**

---

## 1. Directory structure

```
supabase/
├── migration.sql            (493 lines, 27 KB) — full schema v1
├── smart-search-and-tags.sql (111 lines,  5 KB) — tag columns + search fn
└── add-tags.sql              (10 lines,  617 B) — ALTER TABLE, adds tag cols
```

No `migrations/` subfolder. No Supabase CLI config (`supabase/config.toml`
not present). SQL files are meant to be run manually in the Supabase SQL
Editor.

---

## 2. Migration files

| File | Purpose | Line count |
|------|---------|------------|
| `migration.sql` | Full schema: extensions, 9 tables, 14 indexes, 4 triggers, 2 views, 16 RLS policies, seed data stubs | 493 |
| `smart-search-and-tags.sql` | Adds `tags TEXT[]` column + full-text search function `search_resources()` | 111 |
| `add-tags.sql` | Adds `purpose_tags`, `need_tags`, `detail_tags`, `country_codes` arrays + GIN indexes to `resources` | 10 |

### What `migration.sql` creates

**Tables (9):**
1. `countries` — ISO 3166-1 lookup, 5 languages (en/ka/fr/es/ru)
2. `regions` — states/provinces, FK → countries
3. `categories` — hierarchical dot-notation IDs (e.g. `GRANT.STARTUP`), multilingual
4. `resources` — main table, 40+ columns including:
   - PostGIS `GEOGRAPHY(POINT, 4326)` for geo queries
   - `TSVECTOR search_vector` for full-text search
   - `resource_type`: `GRANT | SOCIAL | MEDICAL`
   - `status`: `OPEN | CLOSED | UPCOMING | ONGOING | ARCHIVED`
   - `amount_min / amount_max` in cents
   - `clinical_trial_phase`, `nct_id`, `disease_areas[]`
5. `resource_categories` — M2M: resources ↔ categories
6. `resource_locations` — M2M: resources ↔ countries/regions
7. `resource_contacts` — contact entries per resource
8. `admin_logs` — audit trail
9. `import_logs` — tracks batch imports

**Views (2):**
- `resources_full` (line 322) — denormalized join of resources + categories + locations
- `resource_stats` (line 360) — aggregated counts per type/status

**Indexes (14):**
- B-tree on type, status, deadline, amount ranges, composite type+status+deadline
- GIN on `search_vector` (full-text), `title` (trigram), `purpose_tags`, `need_tags`, etc.
- GIST on `location_point` (PostGIS spatial)

**Triggers (4):**
- `trg_resources_updated_at` — auto-update `updated_at`
- `trg_resources_search_vector` — auto-rebuild `search_vector` on insert/update
- `trg_resources_location_point` — auto-build `GEOGRAPHY` from lat/lng
- `trg_resources_slug` — auto-generate slug from title if not provided

---

## 3. Environment variable names

From `.env.example` (names only — no values):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Both are `VITE_`-prefixed (frontend env vars, bundled at build time).
No server-side Supabase key is referenced anywhere in the codebase
(no `SUPABASE_SERVICE_ROLE_KEY`).

---

## 4. Tables used in client code

| Table | Used in files | Operations |
|-------|---------------|------------|
| `resources_full` (view) | `lib/resources.ts`, `hooks/useResources.ts`, `hooks/usePersonalizedResources.ts` | SELECT with filters, pagination, full-text search |
| `resources` | `admin/ResourceForm.tsx`, `admin/ResourceImport.tsx`, `admin/ResourcesTab.tsx` | INSERT, UPDATE (admin only) |
| `resource_categories` | `admin/ResourceForm.tsx`, `admin/ResourceImport.tsx` | INSERT, DELETE (admin only) |
| `resource_locations` | `admin/ResourceForm.tsx`, `admin/ResourceImport.tsx` | INSERT, DELETE (admin only) |
| `categories` | `lib/resources.ts` | SELECT (filter dropdown) |
| `countries` | `lib/resources.ts` | SELECT (filter dropdown) |
| `regions` | `lib/resources.ts` | SELECT (filter dropdown) |
| `resource_stats` (view) | `lib/resources.ts` | SELECT (stats display) |
| `import_logs` | `admin/ResourceImport.tsx` | INSERT (audit trail) |

---

## 5. Realtime subscriptions

**2 active channels:**

| Channel name | File | What it watches |
|---|---|---|
| `resources-live` | `hooks/useResources.ts:211` | `resources` table — triggers re-fetch on any change |
| `personalized-resources-live` | `hooks/usePersonalizedResources.ts:76` | `resources` table — filtered by user profile |

Both use `postgres_changes` pattern (not broadcast). Both guarded by
`if (!USE_SUPABASE \|\| !supabase) return` — inactive when env vars missing.

---

## 6. RLS policies

16 policies defined in `migration.sql`:

| Policy | Tables | Rule |
|---|---|---|
| `public_read_*` (7 policies) | resources, resource_categories, resource_locations, resource_contacts, categories, countries, regions | `FOR SELECT` — allows anonymous reads |
| `service_role_all_*` (9 policies) | all 9 tables | `TO service_role` — full write access for backend/admin |

No user-level write policies. Admin writes go through the anon key
directly from the browser (`ResourceForm.tsx`, `ResourceImport.tsx`) — this
is a **security concern** worth addressing in R2 (admin writes should go
through a server-side tRPC endpoint with the service role key, not the
anon key in client code).

---

## 7. Client SDK init

**Location:** `client/src/lib/supabase.ts` (14 lines)

```typescript
// Simplified for documentation
export const USE_SUPABASE = !!(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY)
export const supabase = USE_SUPABASE ? createClient(url, key) : null
```

**Fallback behavior:** when `USE_SUPABASE = false`, the app falls back to
`client/src/data/catalog.json` (a static bundled snapshot of the grants
catalog). This means the app is functional even without Supabase — but
the `SOCIAL`, `MEDICAL`, and `GRANT` resource tabs only work when Supabase
is configured.

---

## 8. Dependencies on Supabase

**SDK import (`@supabase/supabase-js` v2.103.0):**

| File | Lines | Role |
|---|---|---|
| `client/src/lib/supabase.ts` | 14 | Client init (only SDK import) |

**Consumers (import from `./supabase` or `@/lib/supabase`):**

| File | Lines | Use |
|---|---|---|
| `client/src/lib/resources.ts` | 297 | All public data fetching (list, detail, categories, countries, stats) |
| `client/src/hooks/useResources.ts` | 233 | React hook — filters, pagination, realtime |
| `client/src/hooks/usePersonalizedResources.ts` | 89 | Personalized resource list (uses user profile) |
| `client/src/components/admin/ResourceForm.tsx` | 674 | Create/edit resources + categories + locations |
| `client/src/components/admin/ResourceImport.tsx` | 399 | Bulk CSV import of resources |
| `client/src/components/admin/ResourcesTab.tsx` | 168 | Admin resource list view |
| `client/src/pages/Catalog.tsx` | — | Imports `useResources` hook |
| `client/src/pages/Admin.tsx` | — | Renders ResourcesTab + ResourceForm |
| `client/src/pages/ResourceDetail.tsx` | — | Single resource view |
| `client/src/components/CatalogCard.tsx` | — | Card rendering |
| `client/src/components/map/MapFilterPanel.tsx` | — | Map sidebar filters |
| `client/src/components/map/MapSortSelect.tsx` | — | Sort dropdown |
| `client/src/components/map/GrantDetailPanel.tsx` | — | Map popup detail |

**Scripts (not client-side):**
- `scripts/migrate-to-supabase.ts` — one-time migration helper from MySQL → Supabase

---

## 9. Estimate: migration complexity to MySQL (R2)

Supabase currently has:
- **9 tables** (vs MySQL's `grants`, `grantTranslations`, `users`, `savedGrants`, `newsletterSubscribers`, `notificationHistory`)
- **2 realtime subscribers** (postgres_changes channels)
- **16 RLS policies**
- **4 database triggers**
- **2 views**
- **PostGIS** extension (geospatial queries)
- **pg_trgm** extension (fuzzy text search)
- **tsvector** full-text search

**Schema gap:** Supabase `resources` schema is significantly richer than
MySQL `grants` — it has `resource_type` (GRANT/SOCIAL/MEDICAL), PostGIS
coordinates, clinical trial fields, tags arrays, M2M categories and
locations, and multilingual title/description columns baked into the main
table (vs MySQL's separate `grantTranslations` table).

**Recommended R2 approach: MEDIUM complexity**

Two sub-paths depending on user's dashboard finding:

- **Path A — Supabase is empty / staging only:**
  Remove Supabase entirely. Rewrite `lib/resources.ts` + `hooks/useResources.ts`
  to call tRPC `catalog.*` endpoints (already exist). Remove admin Resource*
  components or rewrite them as tRPC mutations. Remove `@supabase/supabase-js`
  dep. Delete `supabase/` SQL files. ~15 files modified. Estimated: 1 PR.

- **Path B — Supabase has live data (resources populated):**
  Export first via Supabase dashboard (CSV or pg_dump). Decide: merge into
  MySQL `grants` table (requires schema reconciliation — UUID vs slug IDs,
  PostGIS vs lat/lng doubles, TEXT[] vs comma-string, etc.) OR keep Supabase
  for resource types only and migrate catalog.list to tRPC. Then proceed as
  Path A. Estimated: 2–3 PRs.

**Key risk:** Admin write path currently bypasses the server (anon key
in browser). R2 must route admin mutations through tRPC + server-side key.

---

## 10. Open questions for user (dashboard check required)

Before R2 can be scoped precisely, user needs to answer via Supabase
Dashboard (app.supabase.com → project → Table Editor or SQL Editor):

```sql
SELECT
  (SELECT COUNT(*) FROM resources)           AS resources,
  (SELECT COUNT(*) FROM categories)          AS categories,
  (SELECT COUNT(*) FROM countries)           AS countries,
  (SELECT COUNT(*) FROM regions)             AS regions,
  (SELECT COUNT(*) FROM resource_locations)  AS resource_locations,
  (SELECT COUNT(*) FROM resource_categories) AS resource_categories;
```

| Question | Why it matters |
|---|---|
| Row count in `resources` | If 0, Path A (delete Supabase). If >0, Path B (export first). |
| Row count in `categories` | Determines if hierarchical category tree needs migration |
| Row count in `countries` / `regions` | Lookup data — may already be in MySQL or can be hardcoded |
| Is the Supabase project still active / on a paid plan? | If free tier, project may be paused |
| Are `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set in Railway? | If not set in prod, Supabase features are inactive in production right now |

---

*Generated by Hana — Phase R1.1 reconnaissance. Live DB not queried.*
