-- 0017_add_orgid_to_grants.sql
--
-- Wave 1 / PR#1 of the org-centric migration (5-PR sequence).
--
-- Adds a nullable `orgId` column to the `grants` table, an index on it,
-- and a foreign key to `organizations.orgId` (the VARCHAR slug, not the
-- autoincrement INT — that's what `branches.orgId` and all app code
-- references).
--
-- NULLABLE is intentional: this PR only adds the column. PR#2 backfills
-- values via fuzzy match on organization names + country. PR#3 flips
-- the column to NOT NULL and drops the duplicate columns
-- (organization, phone, email, hqAddress, latitude, longitude, address).
-- PR#4 renames the table to `programs`. PR#5 removes the deprecated
-- `catalog.*` tRPC namespace.
--
-- Safety: FK check is per-row; all existing grants remain NULL and
-- pass silently. Any future write (backfill or otherwise) that inserts
-- a non-existent orgId is rejected at the DB layer.
--
-- Apply with: `DATABASE_URL="mysql://…" node scripts/apply-migration-0017.mjs`
--
-- Idempotent: re-running logs "Duplicate column/key/FK" warnings but
-- does not corrupt the schema.

ALTER TABLE `grants` ADD COLUMN `orgId` varchar(16) NULL;--> statement-breakpoint

CREATE INDEX `grants_orgid_idx` ON `grants` (`orgId`);--> statement-breakpoint

ALTER TABLE `grants`
  ADD CONSTRAINT `fk_grants_org`
  FOREIGN KEY (`orgId`) REFERENCES `organizations`(`orgId`)
  ON UPDATE CASCADE ON DELETE SET NULL;
