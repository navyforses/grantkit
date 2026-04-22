-- 0015_org_enrichment.sql
--
-- Adds enrichment fields to `organizations` and a new
-- `organization_translations` table to support Step 1 of the org
-- data-enrichment plan (see .grantkit-redesign/ORG_ENRICHMENT_PLAN.md).
--
-- All additions are backwards compatible:
--   - new columns are nullable or default to a safe sentinel value
--   - new indices only, no rewrites of existing rows
--
-- Apply with: `node scripts/apply-migration-0015.mjs`

ALTER TABLE `organizations`
  ADD COLUMN `orgLanguages` text NULL,
  ADD COLUMN `acceptsUndocumented` enum('yes','no','case_by_case','unknown') NOT NULL DEFAULT 'unknown',
  ADD COLUMN `acceptsUninsured` enum('yes','no','unknown') NOT NULL DEFAULT 'unknown',
  ADD COLUMN `serviceCost` enum('free','sliding_scale','paid','insurance','mixed','unknown') NOT NULL DEFAULT 'unknown',
  ADD COLUMN `appointmentPolicy` enum('required','walk_in','both','unknown') NOT NULL DEFAULT 'unknown',
  ADD COLUMN `emergencyHotline` varchar(64) NULL,
  ADD COLUMN `foundedYear` int NULL,
  ADD COLUMN `orgType` enum('nonprofit','ngo','government','religious','private','hospital','university','other') NULL,
  ADD COLUMN `googleRating` decimal(2,1) NULL,
  ADD COLUMN `googleReviewCount` int NULL,
  ADD COLUMN `googlePlaceId` varchar(128) NULL,
  ADD COLUMN `logoUrl` text NULL,
  ADD COLUMN `missionStatement` text NULL,
  ADD COLUMN `socialMedia` text NULL,
  ADD COLUMN `requiredDocuments` text NULL,
  ADD COLUMN `verifiedAt` timestamp NULL,
  ADD COLUMN `verifiedBy` int NULL,
  ADD COLUMN `enrichmentStatus` enum('pending','in_progress','complete','needs_review') NOT NULL DEFAULT 'pending';--> statement-breakpoint

CREATE INDEX `orgs_enrichment_status_idx` ON `organizations` (`enrichmentStatus`);--> statement-breakpoint
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
