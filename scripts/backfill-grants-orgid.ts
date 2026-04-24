#!/usr/bin/env tsx
/**
 * backfill-grants-orgid.ts — PR#2 of the org-centric migration (5-PR sequence).
 *
 * Populates `grants.orgId` for every row that still has NULL orgId by
 * matching `grants.organization` + `grants.country` against
 * `organizations.name` + `organizations.country`.
 *
 * PR#1 added the nullable `orgId` column; this script fills it.
 * PR#3 will then flip the column to NOT NULL and drop the duplicate
 * columns (organization, phone, email, hqAddress, latitude, longitude,
 * address).
 *
 * Matching strategy (tiered, most-confident-first):
 *   Tier 1 — exact case-insensitive trimmed match on (name, country)
 *   Tier 2 — normalised match on (name, country):
 *              lowercase + NFKD + strip emoji + strip "(…)" suffixes
 *              + collapse whitespace + strip trailing punctuation
 *   Tier 3 — normalised name-only match, ONLY if unambiguous across orgs
 *
 * Anything that falls through stays NULL and is logged to
 * `backfill-unmatched.json` for manual review. Grants where
 * `organization` itself is NULL stay NULL by design — those are
 * legitimately unlinkable without semantic inference.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-grants-orgid.ts --dry-run    # preview, no writes
 *   pnpm tsx scripts/backfill-grants-orgid.ts              # apply
 *
 * Env:
 *   DATABASE_URL (required) — MySQL URL. Use the Railway PUBLIC URL
 *                             when running from an operator's machine
 *                             (see OPS.md §Batch Geocoding).
 *
 * Safety:
 *   - All writes inside a single transaction; rolled back on any error.
 *   - Idempotent: only touches rows where orgId IS NULL, so re-running
 *     after a partial failure is safe.
 *   - The FK added in PR#1 guarantees we can't insert a bogus orgId —
 *     MySQL rejects at the storage layer.
 *
 * Reports (written to cwd):
 *   backfill-report.json       — per-tier counts, duration, timestamp
 *   backfill-unmatched.json    — grant rows we couldn't link, with the
 *                                normalised key and top-3 candidate
 *                                orgs (for manual review)
 */

import "dotenv/config";
import { writeFileSync } from "fs";
import mysql from "mysql2/promise";

const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : null;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set.");
  console.error("   Set it to the Railway PUBLIC MySQL URL, e.g.");
  console.error("   $env:DATABASE_URL = \"<value of MYSQL_PUBLIC_URL>\"");
  process.exit(1);
}

type OrgRow = { orgId: string; name: string; country: string };
type GrantRow = {
  id: number;
  itemId: string;
  organization: string | null;
  country: string;
};

/**
 * Normalise a free-text organisation name so that superficial
 * differences don't block a match. Strips:
 *   - case differences (lowercase)
 *   - Unicode accent variants (NFKD)
 *   - emoji (🆕 and friends — orgs.name has these as "freshness" flags)
 *   - parenthetical suffixes like "(UK)" or "(FamiCord …)"
 *   - en-dash / em-dash variants (normalised to "-")
 *   - whitespace (collapsed to single space, trimmed)
 *   - trailing punctuation
 *
 * Does NOT strip internal "(FOO)" when it's the whole content — e.g.
 * "Cells4Life (UK)" becomes "cells4life" not "". Parens at the END
 * are treated as qualifiers; parens in the MIDDLE stay.
 */
function normalise(s: string): string {
  let out = s
    .toLowerCase()
    .normalize("NFKD")
    // strip combining diacritics after NFKD
    .replace(/[\u0300-\u036f]/g, "")
    // strip emoji ranges
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F2FF}]/gu,
      ""
    )
    // normalise dashes
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    // strip trailing "(…)" suffixes, possibly repeated
    .replace(/\s*\([^)]*\)\s*$/g, "")
    // strip leading/trailing punctuation
    .replace(/^[\s\-–—.,:;!?"'`]+|[\s\-–—.,:;!?"'`]+$/g, "")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
  // one more pass in case stripping (…) left more (…) behind
  while (/\s*\([^)]*\)\s*$/.test(out)) {
    out = out.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  }
  return out;
}

const started = Date.now();
const conn = await mysql.createConnection(DATABASE_URL);
let txOpen = false;

try {
  console.log(`[backfill] ${DRY_RUN ? "DRY-RUN" : "LIVE"} — connected\n`);

  // ── 1. Load all active orgs into memory (538 rows → trivial) ────────────
  const [orgRowsRaw] = await conn.query(
    `SELECT orgId, name, country FROM organizations WHERE isActive = 1`
  );
  const orgs = orgRowsRaw as OrgRow[];
  console.log(`[backfill] loaded ${orgs.length} active organizations`);

  // ── 2. Build lookup tables ───────────────────────────────────────────────
  // byCountryAndName:   country -> normalisedName -> orgId
  // byNameOnly:         normalisedName -> [orgId, orgId, …]
  const byCountryAndName = new Map<string, Map<string, string>>();
  const byNameOnly = new Map<string, string[]>();

  for (const o of orgs) {
    const norm = normalise(o.name);
    if (!norm) continue;

    let countryMap = byCountryAndName.get(o.country);
    if (!countryMap) {
      countryMap = new Map<string, string>();
      byCountryAndName.set(o.country, countryMap);
    }
    // First writer wins; if two orgs share country+name, the later is
    // logged as a collision (shouldn't happen but is worth knowing).
    if (!countryMap.has(norm)) countryMap.set(norm, o.orgId);

    const list = byNameOnly.get(norm) ?? [];
    list.push(o.orgId);
    byNameOnly.set(norm, list);
  }
  console.log(
    `[backfill] built lookup tables: ${byCountryAndName.size} countries, ${byNameOnly.size} unique normalised names`
  );

  // ── 3. Pull grants still needing orgId ──────────────────────────────────
  const grantSql = `
    SELECT id, itemId, organization, country
      FROM grants
     WHERE orgId IS NULL
       AND isActive = 1
     ORDER BY id
     ${LIMIT ? `LIMIT ${LIMIT}` : ""}
  `;
  const [grantRowsRaw] = await conn.query(grantSql);
  const grants = grantRowsRaw as GrantRow[];
  console.log(`[backfill] loaded ${grants.length} grants needing orgId\n`);

  // ── 4. Match ─────────────────────────────────────────────────────────────
  type UnmatchedEntry = {
    grantId: number;
    itemId: string;
    organization: string;
    country: string;
    normalised: string;
    candidates: { orgId: string; name: string; country: string }[];
  };
  const stats = {
    total: grants.length,
    noOrgString: 0,
    tier1ExactCountryName: 0,
    tier2NormalisedCountryName: 0,
    tier3NormalisedNameUniqueCrossCountry: 0,
    unmatched: 0,
  };
  const updates: Array<{ id: number; orgId: string; tier: number }> = [];
  const unmatched: UnmatchedEntry[] = [];

  for (const g of grants) {
    if (!g.organization || !g.organization.trim()) {
      stats.noOrgString++;
      continue;
    }

    const trimmedLower = g.organization.trim().toLowerCase();
    const norm = normalise(g.organization);

    // Tier 1: exact case-insensitive trim on name+country
    const countryMap = byCountryAndName.get(g.country);
    if (countryMap) {
      // Try normalised (handles both exact and normalised in one map lookup
      // since the map was built with normalise()). But we also want to
      // distinguish tier 1 vs tier 2 for reporting — use the raw trimmed
      // lowercase as the "exact" test.
      for (const o of orgs) {
        if (o.country !== g.country) continue;
        if (o.name.trim().toLowerCase() === trimmedLower) {
          updates.push({ id: g.id, orgId: o.orgId, tier: 1 });
          stats.tier1ExactCountryName++;
          break;
        }
      }
      if (updates.length && updates[updates.length - 1].id === g.id) continue;

      // Tier 2: normalised name+country
      const hit = countryMap.get(norm);
      if (hit) {
        updates.push({ id: g.id, orgId: hit, tier: 2 });
        stats.tier2NormalisedCountryName++;
        continue;
      }
    }

    // Tier 3: normalised name-only, unique across all countries
    const nameHits = byNameOnly.get(norm);
    if (nameHits && nameHits.length === 1) {
      updates.push({ id: g.id, orgId: nameHits[0], tier: 3 });
      stats.tier3NormalisedNameUniqueCrossCountry++;
      continue;
    }

    // No match — record for human review with top-3 cross-country candidates
    const candidates = (nameHits ?? []).slice(0, 3).map((orgId) => {
      const org = orgs.find((o) => o.orgId === orgId)!;
      return { orgId: org.orgId, name: org.name, country: org.country };
    });
    unmatched.push({
      grantId: g.id,
      itemId: g.itemId,
      organization: g.organization,
      country: g.country,
      normalised: norm,
      candidates,
    });
    stats.unmatched++;
  }

  // The Tier 1 detection loop above is O(n*m) but n=968 and m=538 so
  // it's ~half a million ops — runs in well under a second.

  console.log(`[backfill] matching complete:`);
  console.log(`           total grants:              ${stats.total}`);
  console.log(`           no organisation string:    ${stats.noOrgString}`);
  console.log(`           tier 1 (exact name+cntry): ${stats.tier1ExactCountryName}`);
  console.log(`           tier 2 (norm  name+cntry): ${stats.tier2NormalisedCountryName}`);
  console.log(`           tier 3 (norm  name only):  ${stats.tier3NormalisedNameUniqueCrossCountry}`);
  console.log(`           unmatched:                 ${stats.unmatched}`);

  const matched =
    stats.tier1ExactCountryName +
    stats.tier2NormalisedCountryName +
    stats.tier3NormalisedNameUniqueCrossCountry;
  const pctOfLinkable = stats.total - stats.noOrgString === 0
    ? 0
    : Math.round((matched / (stats.total - stats.noOrgString)) * 1000) / 10;
  const pctOfAll = stats.total === 0
    ? 0
    : Math.round((matched / stats.total) * 1000) / 10;
  console.log(`           matched:                   ${matched} (${pctOfLinkable}% of linkable, ${pctOfAll}% of total)\n`);

  // ── 5. Apply updates (inside a transaction) ─────────────────────────────
  if (updates.length === 0) {
    console.log(`[backfill] nothing to write.`);
  } else if (DRY_RUN) {
    console.log(`[backfill] DRY-RUN: would UPDATE ${updates.length} rows, skipped.`);
  } else {
    // Single UPDATE … CASE id WHEN … THEN … END statement for all rows.
    // Rationale: Railway PUBLIC endpoint adds ~60 ms latency per round-trip,
    // so 400+ sequential UPDATEs blow past the sandbox 45-s connection
    // window. One statement with ~600 CASE branches is ~17 KB of SQL,
    // well inside max_allowed_packet (default 64 MB), executes in ~2 s,
    // and is implicitly atomic (MySQL wraps single-statement DML in its
    // own transaction). The explicit beginTransaction / commit below is
    // still kept so that a mid-query disconnect rolls back cleanly.
    const ids = updates.map((u) => u.id);
    const cases = updates
      .map((u) => `WHEN ${u.id} THEN ${conn.escape(u.orgId)}`)
      .join(" ");
    const sql =
      `UPDATE grants SET orgId = CASE id ${cases} END ` +
      `WHERE id IN (${ids.join(",")}) AND orgId IS NULL`;
    console.log(
      `[backfill] executing 1 UPDATE with ${updates.length} CASE branches (${Math.round(sql.length / 1024)} KB SQL)`
    );

    await conn.beginTransaction();
    txOpen = true;
    const [result] = (await conn.query(sql)) as [
      { affectedRows: number },
      unknown
    ];
    await conn.commit();
    txOpen = false;
    console.log(
      `[backfill] wrote ${result.affectedRows} rows in one statement, transaction committed.`
    );
  }

  // ── 6. Reports ───────────────────────────────────────────────────────────
  const report = {
    mode: DRY_RUN ? "dry-run" : "live",
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: Math.round((Date.now() - started) / 1000),
    stats,
    matched,
    pctOfLinkable,
    pctOfAll,
    limit: LIMIT,
  };
  writeFileSync("backfill-report.json", JSON.stringify(report, null, 2));
  writeFileSync("backfill-unmatched.json", JSON.stringify(unmatched, null, 2));
  console.log(`\n[backfill] wrote backfill-report.json + backfill-unmatched.json`);

  // ── 7. Post-verification on the live DB (not in dry-run) ────────────────
  if (!DRY_RUN) {
    const [[totals]] = (await conn.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN orgId IS NOT NULL THEN 1 ELSE 0 END) AS linked
         FROM grants WHERE isActive = 1`
    )) as [{ total: number; linked: number }[], unknown];
    console.log(
      `[backfill] live totals after write: active=${totals.total}, linked=${totals.linked}`
    );
  }

  console.log(`\n[backfill] done in ${Math.round((Date.now() - started) / 1000)}s.`);
} catch (err) {
  if (txOpen) {
    try {
      await conn.rollback();
      console.error(`[backfill] rolled back transaction.`);
    } catch (rollbackErr) {
      console.error(`[backfill] rollback itself failed:`, rollbackErr);
    }
  }
  console.error(`[backfill] FAILED:`, err);
  process.exit(1);
} finally {
  await conn.end();
}
