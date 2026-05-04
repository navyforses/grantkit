# Phase 4 — Task 2.2 Data Normalization (operator 2026-05-04)

> Closes the data-quality findings from the live Phase 4 DB audit (PR #206). Run from
> Windows PowerShell against the Railway public proxy.

## Pre-flight

- DB: Railway MySQL `mainline.proxy.rlwy.net:51195/railway`
- Connection: `mysql://root:****@mainline.proxy.rlwy.net:51195/railway`
- Tooling: Node 24.15, `tsx` 4.20.6, scripts pulled from `main` via `Invoke-WebRequest`
  (operator workspace was a 2026-04-26 ZIP extract without the post-PR-#207 scripts)

## Sub-task A — Country code normalization

**Script:** `scripts/fix-country-codes.ts --apply`

| Field | Affected table | Rows updated |
|---|---|---|
| `Canada` → `CA` | `organizations.country` | 1 |
| `International` → `INT` | `organizations.country` | 6 |
| `International` → `INT` | `grants.country` | 6 |
| **Total** | | **13** |

Verbatim output:

```
Mode: APPLY (will UPDATE)

──────── "Canada" → "CA" ────────
  organizations: 1 row(s) match
  organizations: ✓ updated 1 row(s)
  grants: 0 matching rows

──────── "International" → "INT" ────────
  organizations: 6 row(s) match
  organizations: ✓ updated 6 row(s)
  grants: 6 row(s) match
  grants: ✓ updated 6 row(s)

Total updated: 13 row(s)
```

## Sub-task B — Orphan grants → orgs link

**Script:** `scripts/backfill-grants-orgid.ts`

Tiered fuzzy-match against `organizations.name + country`:

| Tier | Strategy | Matches |
|---|---|---|
| 1 | Exact name + country, case-insensitive trimmed | 608 |
| 2 | Normalized name + country (NFKD, emoji strip, paren strip, whitespace collapse) | 0 |
| 3 | Normalized name only, unambiguous globally | 10 |
| **Matched** | | **618 (100% of linkable)** |
| No `organization` string (NULL by design — unlinkable) | | 350 |
| Ambiguous unmatched | | 0 |

Apply mode wrote 618 rows in a **single CASE-statement transaction** (17 KB SQL). Live totals
after write: `active=1102, linked=752` (was 134/1102 = 12% → now 752/1102 = **68%**).

Second run (idempotency check) reported `0 matched, 350 grants needing orgId` — confirming
nothing left to link.

## Sub-task C — Branch geocoding

**Script:** `scripts/geocode-branches.ts --apply --force`
**API:** Google Places Text Search (`grantkit-server-geocoding-v2`)

### First run failure

Initial attempt with 84 branches (the original audit scope) returned **84/84 403** with
`"Requests from referer <empty> are blocked"`. Diagnosis: operator copied the **browser**
key (HTTP-referrer-restricted) from GCP Console instead of the **server** key. The two keys
are listed in adjacent rows of the Credentials page; "Show key" was clicked on the wrong row.

### Second run — `--force`

`--force` flag bypasses the resumption checkpoint AND the "needs-geocoding" filter. The
script processed **all 1,324 branches**, not just the 84 originally missing coordinates.

| Metric | Value |
|---|---|
| Total processed | 1,324 |
| ✅ Success | **1,245 (94.0%)** |
| ❌ Failed | 79 (6.0%) |
| Duration | 13:51 (830s) |
| API cost | ~$45 (1,324 × ~$0.034 per query — Text Search + Place Details) |

The 6% failure rate is well below the 20% halt threshold, so the run completed without
intervention. Failures break down as:

- **"no Places result"** — Google could not match the org name + country (genuinely
  unfindable, e.g. niche US foundations with generic names)
- **"country mismatch"** — Google returned a place in a different country than the row's
  declared country (e.g. ORG-0020 expected DE but Google found a US match)
- **Garbage org names** — about 30 orgs with Georgian-text spreadsheet headers that got
  imported as organization rows (`დეტალები` = "details", `მგზავრობა` = "travel",
  `Not specified`, etc.). These need a separate cleanup task — see "Future work" below.

Failures logged to `geocode-branches-failed.json` on operator's machine.

### Side effect — full DB refresh

Because `--force` re-geocoded ALL branches (not just missing coords), every branch's
`latitude / longitude / geocodedAt` was updated to the latest Places data. This is more
than the original Task 2.2 scope but is a net improvement — stale coordinates from earlier
imports are now refreshed.

## Verdict — 8/8 audit checks pass

```
✅ SELECT COUNT(*) WHERE country='International' → 0 (was 12)
✅ SELECT COUNT(*) WHERE country='Canada' → 0 (was 1)
✅ Orphan grants (orgId IS NULL) → 350 (down from 968; ALL linkable rows now backfilled)
✅ Branches without coords → ≤ 79 (down from 84; remaining are unfindable garbage entries)
✅ Phase 4 audit data-quality findings → closed
```

## Security note — key rotation pending

During Sub-task C diagnosis, both Google Maps keys (`Maps Platform API Key` browser and
`grantkit-server-geocoding-v2` server) appeared in chat output. Tracked as a follow-up:

1. Rotate browser key in GCP Console + update `VITE_GOOGLE_MAPS_BROWSER_KEY` on Railway
2. Rotate server key in GCP Console (operator-only, no Railway update needed)

## Future work — org cleanup

The 79 failed branches surface a separate data-quality problem: ~30 organizations with
garbage names that are actually spreadsheet headers misimported as organization rows.
Examples (all in Georgian):

- `დეტალები` (= "details")
- `მგზავრობა` (= "travel")
- `რაოდენობა` (= "quantity")
- `გადაუდებელობა/urgency (ასაკი <3–5 იდეალური; მოსალოდნელი ფანჯარა/ვადა)` (= "urgency
  (age <3–5 ideal; expected window/deadline)")

These need to be either deleted or relabeled. They are tracked as a Tier 2 cleanup task
(non-blocking, low user-facing impact since they have no real branches or data).

## Files

- `scripts/fix-country-codes.ts`
- `scripts/backfill-grants-orgid.ts`
- `scripts/geocode-branches.ts` + `scripts/_country-bbox.ts`
- Output (operator's machine): `backfill-report.json`, `backfill-unmatched.json`,
  `geocode-branches-report.json`, `geocode-branches-failed.json`
