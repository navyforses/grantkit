-- 0015_org_enrichment_v2.sql
--
-- Adds the 7 user-approved enrichment fields to `organizations` and a
-- new `organization_translations` table. Scope is intentionally smaller
-- than the first attempt (PR #145, reverted): omits foundedYear,
-- orgType, verifiedAt/verifiedBy, and the enrichmentStatus workflow
-- column. Those can land in a follow-up migration if needed.
--
-- All additions are backwards compatible:
--   - new columns are nullable or default to "unknown"
--   - new indices only, no rewrites of existing rows
--
-- Apply with: `node scripts/apply-migration-0015.mjs`

ALTER TABLE `organizations`
  ADD COLUMN `orgLanguages` text NULL,
  ADD COLUMN `acceptsUndocumented` enum('yes','no','case_by_case','unknown') NOT NULL DEFAULT 'unknown',
  ADD COLUMN `acceptsUninsured` enum('yes','no','unknown') NOT NULL DEFAULT 'unknown',
  ADD COLUMN `serviceCost` enum('free','sliding_scale','paid','insurance','mixed','unknown') NOT NULL DEFAULT 'unknown',
  ADD COLUMN `appointmentPolicy` enum('required','walk_in','both','unknown') NOT NULL DEFAULT 'unknown',
  ADD COLUMN `googleRating` decimal(2,1) NULL,
  ADD COLUMN `googleReviewCount` int NULL,
  ADD COLUMN `googlePlaceId` varchar(128) NULL,
  ADD COLUMN `missionStatement` text NULL,
  ADD COLUMN `socialMedia` text NULL;--> statement-breakpoint

CREATE INDEX `orgs_accepts_undocumented_idx` ON `organizations` (`acceptsUndocumented`);--> statement-breakpoint
CREATE INDEX `orgs_service_cost_idx` ON `organizations` (`serviceCost`);--> statement-breakpoint

CREATE TABLE `organization_translations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `orgId` varchar(16) NOT NULL,
  `language` varchar(10) NOT NULL,
  `name` text NULL,
  `description` text NULL,
  `missionStatement` text NULL,
  `translatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `source` varchar(32) NULL,
  CONSTRAINT `organization_translations_id` PRIMARY KEY(`id`),
  CONSTRAINT `org_lang_idx` UNIQUE(`orgId`, `language`)
);--> statement-breakpoint

CREATE INDEX `org_translations_lang_idx` ON `organization_translations` (`language`);
