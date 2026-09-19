# PR#2 — Backfill `grants.orgId` — Run Note

**Date:** 2026-04-23
**Author:** Tamar (Wave 1)
**Script:** `scripts/backfill-grants-orgid.ts`
**Target DB:** Railway MySQL (`mainline.proxy.rlwy.net:59681`)

## Prerequisite discovered at runtime

Migration `0017_add_orgid_to_grants.sql` had not actually been applied to Railway despite PR#1 merge. Running the backfill failed with `Unknown column 'orgId' in 'where clause'`. Applied the migration manually:

```
DATABASE_URL=... node scripts/apply-migration-0017.mjs
```

Result: column `orgId VARCHAR(16) NULL` added, index `grants_orgid_idx` created, FK `fk_grants_org` → `organizations.orgId` established. Pre-backfill state: 731 active grants, 0 linked.

## Backfill result

| Metric | Value |
|---|---|
| Active grants needing orgId | 731 |
| No organization string (unlinkable by design) | 102 |
| Linkable pool | 629 |
| Tier 1 — exact (name + country, case-insensitive, trimmed) | 605 |
| Tier 2 — normalised (name + country) | 0 |
| Tier 3 — normalised name-only, globally unique | 6 |
| **Matched** | **611** |
| **Match rate (of linkable)** | **97.1 %** |
| **Match rate (of total)** | **83.6 %** |
| Unmatched (logged for manual review) | 18 |
| Duration | 2 s |

Target from `EXECUTION-PLAN.md` was ≥ 85 % of linkable. Actual 97.1 % exceeds it.

## The 18 unmatched rows

Split into three human-fixable buckets, not script failures:

1. **Personal names used as organization** (~5 rows): `Ava Johnson 🇺🇸`, `Gavin Pigott 🇺🇸`, `Matthew Pecor 🇺🇸`, `Luca Lisson`. These are individual GoFundMe-style campaigns, not organisations; they legitimately have no corresponding row in the `organizations` table.
2. **Georgian-language content leaked into `organization` field** (~9 rows): `გადაუდებელობა/urgency`, `დეტალები`, `მგზავრობა`, etc. Data-quality issue from an older LLM extraction pipeline; the `organization` field was populated with section headers or filler content instead of a real org name.
3. **Orphan / renamed / deactivated orgs** (~4 rows): `Blessed Gates` (x2), `WolfPups On Wheels, Inc.`, etc. Either the org was removed from the enriched set or the name drifted.

Full list in `backfill-unmatched.json`.

**Recommendation:** defer manual cleanup of these 18 rows until PR#3 (NOT NULL migration). At NOT NULL time we either (a) create catch-all `ORG-ORPHAN-*` stubs for them, (b) hard-deactivate them, or (c) re-extract the `organization` field from `name` + `description` via LLM. Decision belongs in the PR#3 planning session.

## Script changes vs. original draft

Original script batched updates by `orgId` using `UPDATE … WHERE id IN (?)`. First live attempt over the Railway PUBLIC endpoint hit the 45 s sandbox timeout because 400+ sequential round-trips × ~60 ms latency > 24 s of pure network overhead before SQL execution.

Rewrote to issue a single `UPDATE grants SET orgId = CASE id WHEN … THEN … END WHERE id IN (…)` statement. Final SQL is ~17 KB (well under `max_allowed_packet`), executes in ~2 s end-to-end, and is implicitly atomic. Explicit `beginTransaction` / `commit` retained so a mid-query disconnect rolls back cleanly.

## Post-write verification

```sql
SELECT COUNT(*) AS total,
       SUM(CASE WHEN orgId IS NOT NULL THEN 1 ELSE 0 END) AS linked
  FROM grants WHERE isActive = 1;
-- total=731, linked=611
```

## Files produced

- `backfill-report.json` — per-tier stats, duration, mode
- `backfill-unmatched.json` — 18 rows needing human review

## Next step — PR#3

1. Decide fate of the 18 unmatched (orphan stubs vs. deactivate vs. re-extract).
2. Flip `grants.orgId` to `NOT NULL`.
3. Drop duplicate columns: `organization`, `phone`, `grantEmail`, `address`, `latitude`, `longitude`, `state`, `city`.
4. Drop `organization_translations` table (if unused after catalog.* removal — verify first).
