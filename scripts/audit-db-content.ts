/**
 * audit-db-content.ts — Phase 4 DB content audit
 *
 * Read-only script. Connects to production MySQL, runs ~15 audit queries,
 * writes markdown report to audit-reports/04-db-content.md.
 *
 * Usage:
 *   DATABASE_URL="mysql://..." tsx scripts/audit-db-content.ts
 *
 * Or with the Railway public URL alias:
 *   DATABASE_URL="$MYSQL_PUBLIC_URL" tsx scripts/audit-db-content.ts
 *
 * No writes, no schema changes. Safe to run anytime.
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required");
  process.exit(1);
}

const REPORT_PATH = path.resolve(process.cwd(), "audit-reports/04-db-content.md");

type Row = Record<string, unknown>;

async function q(conn: mysql.Connection, sql: string): Promise<Row[]> {
  const [rows] = await conn.query(sql);
  return rows as Row[];
}

function table(rows: Row[]): string {
  if (rows.length === 0) return "_(no rows)_";
  const cols = Object.keys(rows[0]);
  const head = "| " + cols.join(" | ") + " |";
  const sep = "| " + cols.map(() => "---").join(" | ") + " |";
  const body = rows
    .map((r) => "| " + cols.map((c) => String(r[c] ?? "")).join(" | ") + " |")
    .join("\n");
  return [head, sep, body].join("\n");
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const sections: string[] = [];

  // ===== 1. Row counts =====
  sections.push("## 1. Row counts");
  sections.push(
    table(
      await q(
        conn,
        `SELECT 'users' as t, COUNT(*) as n FROM users UNION ALL
         SELECT 'grants', COUNT(*) FROM grants UNION ALL
         SELECT 'grants(active)', COUNT(*) FROM grants WHERE isActive = true UNION ALL
         SELECT 'grant_translations', COUNT(*) FROM grant_translations UNION ALL
         SELECT 'organizations', COUNT(*) FROM organizations UNION ALL
         SELECT 'organization_branches', COUNT(*) FROM organization_branches UNION ALL
         SELECT 'saved_grants', COUNT(*) FROM saved_grants UNION ALL
         SELECT 'newsletter_subscribers', COUNT(*) FROM newsletter_subscribers UNION ALL
         SELECT 'newsletter_subscribers(active)', COUNT(*) FROM newsletter_subscribers WHERE isActive = true UNION ALL
         SELECT 'notification_history', COUNT(*) FROM notification_history`,
      ),
    ),
  );

  // ===== 2. Organizations coverage gaps =====
  sections.push("\n## 2. Organizations — coverage gaps");
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           COUNT(*) as total,
           SUM(description IS NULL OR description = '') as missing_desc,
           SUM(phone IS NULL OR phone = '') as missing_phone,
           SUM(email IS NULL OR email = '') as missing_email,
           SUM(website IS NULL OR website = '') as missing_website,
           SUM(missionStatement IS NULL OR missionStatement = '') as missing_mission,
           SUM(googlePlaceId IS NULL OR googlePlaceId = '') as missing_googlePlaceId,
           SUM(orgLanguages IS NULL OR orgLanguages = '') as missing_languages
         FROM organizations`,
      ),
    ),
  );

  // ===== 3. Branches with bad coordinates =====
  sections.push("\n## 3. Organization branches — coordinate quality");
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           COUNT(*) as total_branches,
           SUM(latitude IS NULL OR longitude IS NULL) as missing_coords,
           SUM(latitude = 0 AND longitude = 0) as null_island,
           SUM(latitude < -90 OR latitude > 90) as bad_lat,
           SUM(longitude < -180 OR longitude > 180) as bad_lng
         FROM organization_branches`,
      ),
    ),
  );

  // ===== 4. Country code quality (varchar(8) constraint) =====
  sections.push("\n## 4. Country codes — bad values");
  sections.push("### Organizations");
  sections.push(
    table(
      await q(
        conn,
        `SELECT country, COUNT(*) as n FROM organizations
         WHERE country IS NULL OR country = '' OR LENGTH(country) > 8 OR LOWER(country) IN ('null', 'undefined', 'na', 'n/a')
         GROUP BY country ORDER BY n DESC LIMIT 20`,
      ),
    ),
  );
  sections.push("### Grants");
  sections.push(
    table(
      await q(
        conn,
        `SELECT country, COUNT(*) as n FROM grants WHERE isActive = true AND
           (country IS NULL OR country = '' OR LENGTH(country) > 8 OR LOWER(country) IN ('null', 'undefined', 'na', 'n/a'))
         GROUP BY country ORDER BY n DESC LIMIT 20`,
      ),
    ),
  );

  // ===== 5. Potential org duplicates (name+country) =====
  sections.push("\n## 5. Organizations — potential duplicates (same name + country)");
  sections.push(
    table(
      await q(
        conn,
        `SELECT name, country, COUNT(*) as copies FROM organizations
         GROUP BY name, country HAVING COUNT(*) > 1 ORDER BY copies DESC LIMIT 20`,
      ),
    ),
  );

  // ===== 6. Orphan grants (orgId → non-existent org) =====
  sections.push("\n## 6. Grants — orphan orgId references");
  sections.push(
    table(
      await q(
        conn,
        `SELECT g.orgId, COUNT(*) as orphan_grants
         FROM grants g
         LEFT JOIN organizations o ON g.orgId = o.orgId
         WHERE g.orgId IS NOT NULL AND o.orgId IS NULL AND g.isActive = true
         GROUP BY g.orgId ORDER BY orphan_grants DESC LIMIT 20`,
      ),
    ),
  );
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           SUM(orgId IS NULL) as grants_without_orgId,
           COUNT(*) as total_active
         FROM grants WHERE isActive = true`,
      ),
    ),
  );

  // ===== 7. Translation completeness =====
  sections.push("\n## 7. Grant translations — coverage by language");
  sections.push(
    table(
      await q(
        conn,
        `SELECT language,
           COUNT(*) as rows,
           SUM(name IS NULL OR name = '') as missing_name,
           SUM(description IS NULL OR description = '') as missing_desc,
           SUM(eligibility IS NULL OR eligibility = '') as missing_eligibility
         FROM grant_translations
         GROUP BY language ORDER BY language`,
      ),
    ),
  );
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           (SELECT COUNT(*) FROM grants WHERE isActive = true) as active_grants,
           (SELECT COUNT(DISTINCT grantItemId) FROM grant_translations WHERE language = 'en') as en_covered,
           (SELECT COUNT(DISTINCT grantItemId) FROM grant_translations WHERE language = 'fr') as fr_covered,
           (SELECT COUNT(DISTINCT grantItemId) FROM grant_translations WHERE language = 'es') as es_covered,
           (SELECT COUNT(DISTINCT grantItemId) FROM grant_translations WHERE language = 'ru') as ru_covered,
           (SELECT COUNT(DISTINCT grantItemId) FROM grant_translations WHERE language = 'ka') as ka_covered`,
      ),
    ),
  );

  // ===== 8. Stale enrichment =====
  sections.push("\n## 8. Stale enrichment (verified > 90 days ago)");
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           SUM(phoneVerifiedAt IS NOT NULL AND phoneVerifiedAt < DATE_SUB(NOW(), INTERVAL 90 DAY)) as stale_phone,
           SUM(emailVerifiedAt IS NOT NULL AND emailVerifiedAt < DATE_SUB(NOW(), INTERVAL 90 DAY)) as stale_email,
           SUM(phoneVerifiedAt IS NULL AND phone IS NOT NULL) as phone_no_provenance,
           SUM(emailVerifiedAt IS NULL AND email IS NOT NULL) as email_no_provenance
         FROM organizations`,
      ),
    ),
  );

  // ===== 9. Contact enrichment batch progress =====
  sections.push("\n## 9. Contact enrichment — batch progress");
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           COALESCE(contactEnrichmentStatus, 'NULL') as status,
           COUNT(*) as n
         FROM organizations
         GROUP BY contactEnrichmentStatus ORDER BY n DESC`,
      ),
    ),
  );

  // ===== 10. Top countries by org count =====
  sections.push("\n## 10. Geographic distribution — top 15 countries");
  sections.push(
    table(
      await q(
        conn,
        `SELECT country, COUNT(*) as n FROM organizations
         GROUP BY country ORDER BY n DESC LIMIT 15`,
      ),
    ),
  );

  // ===== 11. User signups =====
  sections.push("\n## 11. Users — signup + subscription summary");
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           COUNT(*) as total_users,
           SUM(emailVerified = true) as verified,
           SUM(role = 'admin') as admins,
           SUM(subscriptionStatus = 'active') as active_subs,
           SUM(subscriptionStatus = 'cancelled') as cancelled,
           SUM(subscriptionStatus = 'past_due') as past_due
         FROM users`,
      ),
    ),
  );

  // ===== 12. Auth security: locked accounts + failed login attempts =====
  sections.push("\n## 12. Auth — locked / suspicious accounts");
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           SUM(lockedUntil IS NOT NULL AND lockedUntil > NOW()) as currently_locked,
           SUM(failedLoginAttempts >= 5) as 5plus_failed,
           MAX(failedLoginAttempts) as worst_offender
         FROM users`,
      ),
    ),
  );

  // ===== 13. Saved grants per user (engagement signal) =====
  sections.push("\n## 13. Saved grants — engagement");
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           COUNT(*) as total_saves,
           COUNT(DISTINCT userId) as users_with_saves,
           ROUND(AVG(per_user.cnt), 2) as avg_saves_per_user
         FROM saved_grants
         CROSS JOIN (SELECT userId, COUNT(*) as cnt FROM saved_grants GROUP BY userId) per_user`,
      ),
    ),
  );

  // ===== 14. Newsletter health =====
  sections.push("\n## 14. Newsletter — subscriber health");
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           COUNT(*) as total,
           SUM(isActive = true) as active,
           SUM(isActive = false) as unsubscribed,
           SUM(unsubscribedAt IS NOT NULL) as has_unsub_timestamp
         FROM newsletter_subscribers`,
      ),
    ),
  );

  // ===== 15. Notification history =====
  sections.push("\n## 15. Notification history — recent campaigns");
  sections.push(
    table(
      await q(
        conn,
        `SELECT
           id, subject, recipientCount, sentAt
         FROM notification_history ORDER BY sentAt DESC LIMIT 10`,
      ),
    ),
  );

  await conn.end();

  // ===== Write report =====
  const header = `# Phase 4 — DB Content Audit

> Generated: ${new Date().toISOString()}
> Source: production MySQL via MYSQL_PUBLIC_URL
> Read-only audit. No data modified.

`;

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, header + sections.join("\n\n") + "\n");
  console.log(`✓ Report written to ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error("✗ Audit failed:", err);
  process.exit(1);
});
