-- 0016_contact_provenance.sql
--
-- Phase A of the contact-enrichment plan. Adds provenance columns so
-- every phone and email we later populate from Google Places / website
-- scraping carries a source + verification timestamp. The UI can show
-- "Verified via Google Places, 2 days ago" badges and a scheduled job
-- can re-verify stale rows.
--
-- Additions only — no rewrites. All columns nullable / default 'pending'.
--
-- Apply with: `node scripts/apply-migration-0016.mjs`

ALTER TABLE `organizations`
  ADD COLUMN `phoneSource` varchar(32) NULL,
  ADD COLUMN `phoneVerifiedAt` timestamp NULL,
  ADD COLUMN `emailSource` varchar(32) NULL,
  ADD COLUMN `emailVerifiedAt` timestamp NULL,
  ADD COLUMN `contactFormUrl` varchar(500) NULL,
  ADD COLUMN `contactEnrichmentBatch` varchar(32) NULL,
  ADD COLUMN `contactEnrichmentStatus` enum('pending','enriched','no_data','failed') NOT NULL DEFAULT 'pending';--> statement-breakpoint

CREATE INDEX `orgs_contact_batch_idx` ON `organizations` (`contactEnrichmentBatch`);--> statement-breakpoint

CREATE INDEX `orgs_contact_status_idx` ON `organizations` (`contactEnrichmentStatus`);
