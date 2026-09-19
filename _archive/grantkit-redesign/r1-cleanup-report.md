# Phase R1 Cleanup Report

Date: 2026-04-20
Branch: `claude/root-cleanup-supabase-XJHyF`
Author: Hana (Data Quality Engineer + Cleanup Specialist)

---

## Files moved

| From (repo root) | To |
|---|---|
| `GrantKit_Diagnostic.pptx` | `.grantkit-redesign/GrantKit_Diagnostic.pptx` |
| `ideas.md` | `.grantkit-redesign/ideas.md` |
| `todo.md` | `.grantkit-redesign/todo.md` |

All moves performed with `git mv` (history preserved).

## Files deleted

| File | Reasoning |
|---|---|
| `requirements.txt` | 0 references. Declares `bcrypt` for a phantom `auth.py`; no `.py` files exist anywhere in repo. |
| `seed-grants.mjs` | 0 references. One-shot historical seeder ("Run once"), no `package.json` entry, DB already populated via `migrate-catalog.ts` and daily-discovery pipeline. |

## Files flagged but NOT deleted (needs user decision)

### `client/src/components/Map.tsx` — KEPT
**Initial recommendation:** DELETE (0 imports, commentary-only template).
**Regression discovered:** deletion triggered 30+ new `Cannot find namespace 'google'` errors across `MapPanel.tsx`, `LocationMap.tsx`, `Catalog.tsx`, `MobileCatalogView.tsx`, `SplitView.tsx`, `useGeocodedAddress.ts`, `useGoogleMapFlyTo.ts`, `googleMapsLoader.ts`.

**Root cause:** line 77 of `Map.tsx` contains:
```ts
/// <reference types="@types/google.maps" />
```
This triple-slash directive was the de-facto global ambient-types anchor for the whole Google Maps integration. `tsconfig.json` has `"types": ["node", "vite/client"]` — `@types/google.maps` is NOT in that array, so it is not auto-loaded elsewhere.

**Clean fix (out of R1 scope — R1 forbids TS code changes):**
Add `"google.maps"` to the `types` array in `tsconfig.json`, OR move the triple-slash reference to `client/src/vite-env.d.ts`. Then Map.tsx can be safely deleted in a follow-up PR.

→ Restored via commit `1dffa70`. Flagging for follow-up.

### `.gitkeep` at repo root (empty file)
Unusual but harmless. Not on Elena's list. No action.

### `package-lock.json` alongside `pnpm-lock.yaml`
CLAUDE.md rule: "Package manager: always pnpm, never npm or yarn." The `package-lock.json` should not exist. Flagged for user decision — deletion requires confirmation since it might be kept for Vercel / some external tool. **No action taken.**

## .gitignore changes

**None.** The R1 protocol asked to add `pending-imports/` to `.gitignore`, but the existing `.gitignore` already contains this explicit commented-out entry (lines 99–100):
```
# Pending grant imports — tracked for daily discovery commits
# pending-imports/
```
This is **deliberate project policy** — `.github/workflows/daily-discovery.yml` commits JSON artifacts into `pending-imports/` every day. 15 files currently tracked there. Adding the gitignore entry would silently break the discovery workflow.

→ Flagging for user decision. No commit made.

## Verification

| Check | Before R1 (6e8c09e) | After R1 | Delta |
|---|---|---|---|
| `pnpm check` errors | 7 | 7 | 0 (all pre-existing i18n dup-key issues, unrelated to R1) |
| `pnpm build` | ✅ passes | ✅ passes | unchanged |
| Tracked files in git | baseline | −3 deleted, 3 moved | net −3 files at root |

No database data was modified. No TypeScript code was modified.

## Supabase reconnaissance

### Env vars (names only — values NOT read)
From `.env.example`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Client init
`client/src/lib/supabase.ts` — if both env vars are set, `USE_SUPABASE = true` and a real client is created; otherwise the client is `null` and the app falls back to `catalog.json` (a static bundled JSON file in `client/src/data/`).

### Tables used by client code
Via `.from('…')` calls in client/src:
- `resources_full` (view)
- `resources`
- `resource_categories`
- `resource_locations`
- `categories`
- `countries`
- `regions`
- `resource_stats` (view)
- `import_logs`

18 files in `client/src/` reference Supabase:
- `lib/supabase.ts`, `lib/resources.ts`, `lib/constants.ts`
- `hooks/useResources.ts`, `hooks/usePersonalizedResources.ts`
- `pages/Catalog.tsx`, `pages/Admin.tsx`, `pages/ResourceDetail.tsx`
- `components/admin/Resource{Form,Import,List,sTab}.tsx`
- `components/CatalogCard.tsx`
- `components/map/{GrantDetailPanel,MapFilterPanel,MapSortSelect}.tsx`
- `i18n/types.ts`, `vite-env.d.ts`

### Migration files in `supabase/`
3 SQL files totaling ~33 KB:
- `migration.sql` (27 KB) — 9 tables + indexes + triggers + RLS + views
- `smart-search-and-tags.sql` (5 KB)
- `add-tags.sql` (617 B)

### Tables declared in `supabase/migration.sql` (9 tables + 2 views)
1. `countries` (ISO lookup, 5 languages)
2. `regions` (FK → countries)
3. `categories` (hierarchical, multilingual)
4. `resources` (main — 40+ columns including PostGIS `location_point`, TSVECTOR search, deadlines, amounts, clinical trial fields)
5. `resource_categories` (M2M)
6. `resource_locations` (M2M)
7. `resource_contacts`
8. `admin_logs`
9. `import_logs`
+ views: `resources_full`, `resource_stats`

### Legacy migration script
`scripts/migrate-to-supabase.ts` exists — one-way migration helper from MySQL (Drizzle) → Supabase (PG). Exists but unclear if ever run in production.

### Data-size reconnaissance — NOT PERFORMED
Per R1 protocol: "DO NOT attempt to query Supabase database without user credentials."

**User decision needed** — one of:
1. **(preferred)** User logs into Supabase dashboard and reports row counts for:
   - `resources`, `resource_categories`, `resource_locations`, `categories`, `countries`, `regions`
2. User temporarily provides `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` via secure channel, then we run a read-only count query and discard creds.
3. User confirms Supabase project is empty / unused (Option C — if Supabase was never populated in prod, R2 becomes trivial).

### Recommendation for R2 (Supabase deprecation)

Two paths depending on data-size reconnaissance outcome:

- **If `resources` is empty or <100 rows:** delete `supabase/` SQL files, remove `@supabase/supabase-js` dep, delete `client/src/lib/supabase.ts`, rewrite `hooks/useResources.ts` + `lib/resources.ts` to call tRPC (`catalog.*`) instead. Estimated scope: 1 PR, ~18 files modified.
- **If `resources` has substantive data:** export first (supabase dashboard or `pg_dump`), merge/reconcile with MySQL `grants` table (note: schemas differ significantly — Supabase uses UUIDs + PostGIS + TEXT[]; MySQL uses itemId slugs + lat/lng doubles + comma-lists), THEN delete. Estimated scope: 2 PRs (migrate then deprecate).

Either path should also handle the admin `Resource*` UI (currently writes directly to Supabase — would need to either be rewired to tRPC or removed if unused).

## Commits made

```
1dffa70 chore(r1): restore Map.tsx — it anchors google.maps ambient types
178f154 chore(r1): remove dead files after reference check
d42a877 chore(r1): move slides and personal notes out of root
```

## Next step

**R2 is blocked on user decision about Supabase data.** Please answer:

1. Supabase row counts (or confirm project unused)?
2. Keep or delete `package-lock.json` (CLAUDE.md says pnpm-only)?
3. Should a follow-up PR fix the `@types/google.maps` tsconfig issue so Map.tsx can be cleanly deleted?
4. Is the deliberate tracking of `pending-imports/` still intended for the daily-discovery workflow?

Once answered, R2 (Supabase deprecation) can be planned with the correct scope.
