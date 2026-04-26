-- 0019_branches_geocoded_at.sql
--
-- Adds `geocodedAt` to organization_branches so geocode-branches.ts can
-- record when each row's lat/lng was filled (mirrors `grants.geocodedAt`
-- from migration 0012).
--
-- Why a new column instead of reusing `source`:
--   * `source` already documents WHERE the lat/lng came from
--     ("Database" | "Google Places" | "Google Places (HQ)" | "Not found").
--   * `geocodedAt` documents WHEN, which is what we need for re-geocoding
--     stale rows and for the geocode-branches checkpoint logic.
--
-- Idempotent if run via apply-migration-0019.mjs — the apply script
-- swallows ER_DUP_FIELDNAME so re-runs are safe.

ALTER TABLE `organization_branches`
  ADD COLUMN `geocodedAt` TIMESTAMP NULL;
--> statement-breakpoint

CREATE INDEX `branches_geocoded_at_idx` ON `organization_branches` (`geocodedAt`);
