-- 0018_france_schema_and_drop_org_translations.sql
--
-- Three blocks combined to support France Import (624 orgs) while cleaning
-- up the dead `organization_translations` table from Phase 2 (ARCHIVED).
--
--   Block 1: DROP empty `organization_translations` (0 rows, 0 readers/writers
--            in code — confirmed by codebase grep on 2026-04-25).
--
--   Block 2: ALTER `organizations` to add France-specific columns + a JSON
--            `translations` column (replaces the dropped per-language table).
--
--   Block 3: CREATE `organization_housing` for the 102 housing-specific
--            rows (shelters / temporary stays) on the Georgian sheet.
--
-- See `.grantkit-redesign/HANDOFF-claude-code-wave1.md` for column rationale.

-- Block 1 — drop dead Phase 2 table
DROP TABLE IF EXISTS `organization_translations`;
--> statement-breakpoint

-- Block 2 — organizations extensions
ALTER TABLE `organizations`
  ADD COLUMN `translations`        JSON,
  ADD COLUMN `abbreviation`        VARCHAR(32),
  ADD COLUMN `organizationType`    ENUM('NGO','association','government','private') NULL,
  ADD COLUMN `servicesOffered`     TEXT,
  ADD COLUMN `targetAudience`      TEXT,
  ADD COLUMN `emigrationPurpose`   VARCHAR(64),
  ADD COLUMN `foundedYear`         INT,
  ADD COLUMN `legalStatus`         VARCHAR(255),
  ADD COLUMN `mainCategory`        VARCHAR(64),
  ADD COLUMN `isNational`          BOOLEAN NOT NULL DEFAULT FALSE;
--> statement-breakpoint

CREATE INDEX `orgs_main_category_idx` ON `organizations` (`mainCategory`);
--> statement-breakpoint

CREATE INDEX `orgs_is_national_idx` ON `organizations` (`isNational`);
--> statement-breakpoint

CREATE INDEX `orgs_org_type_idx` ON `organizations` (`organizationType`);
--> statement-breakpoint

-- Block 3 — housing table (102 rows for shelters / temp housing)
CREATE TABLE `organization_housing` (
  `id`                   INT AUTO_INCREMENT PRIMARY KEY,
  `orgId`                VARCHAR(16) NOT NULL,
  `housingType`          ENUM('parents_house','shelter','social','temporary','hotel','apartment','other') NULL,
  `description`          TEXT,
  `registrationProcess`  TEXT,
  `costDetails`          TEXT,
  `maxStayDuration`      VARCHAR(64),
  `capacity`             VARCHAR(64),
  `childrenFriendly`     ENUM('yes','no','unknown') DEFAULT 'unknown',
  `disabledAccessible`   ENUM('yes','no','unknown') DEFAULT 'unknown',
  `relevanceNotes`       TEXT,
  `createdAt`            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `org_housing_idx` (`orgId`),
  INDEX `housing_type_idx` (`housingType`)
);
