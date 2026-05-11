# GrantKit — Ops Runbook

> **მიზანი:** მომავალ ოპერატორებს (მათ შორის AI assistant-ებს) ეცოდინებათ **რა უკვე არსებობს** და **სად მოძებნონ values** — რომ ოპერაცია ორჯერ არ გაკეთდეს.
>
> **წესი:** არანაირი secret value აქ. მხოლოდ **სახელები** და **ლოკაციები**.

---

## 🔑 Credentials Inventory

### Google Cloud — Maps Platform

Project: **"My Project 30040"** (Cloud Console-ში ხილული სახელი)

| Key name                       | Type     | Restrictions                          | Used by                              |
|--------------------------------|----------|---------------------------------------|--------------------------------------|
| `Maps Platform API Key`        | Browser  | HTTP referrers                        | Frontend (`VITE_GOOGLE_MAPS_BROWSER_KEY`) |
| `grantkit-server-geocoding-v2` | Server   | None (IP unrestricted), 2 APIs        | `scripts/geocode-grants.ts` (batch geocoding) |

**APIs enabled** in the project:
- ✅ Maps JavaScript API (frontend map)
- ✅ Places API (New) (server geocoding)
- ✅ Geocoding API (server geocoding)

**Dashboard:** https://console.cloud.google.com/apis/credentials

### Anthropic API

- Env var: `ANTHROPIC_API_KEY` — set on Railway `grantkit` service
- Used by: AI Assistant (`server/routers.ts` `ai.grantChat`)

### MySQL — Railway

- **Project:** `lovely-forgiveness` (ID: `c0e1d580-c98d-4fc1-a277-cfc98063fe04`)
- **Service:** `MySQL` (plugin)
- **Environment:** `production`
- **Variables available** on the MySQL service (Railway dashboard → MySQL → Variables):
  - `MYSQL_URL` — internal (`mysql.railway.internal:3306`) — used by the grantkit service in-cluster
  - `MYSQL_PUBLIC_URL` — public (`mainline.proxy.rlwy.net:<PORT>`) — for external tooling like `pnpm geocode:grants`
  - `MYSQL_ROOT_PASSWORD`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLHOST`, `MYSQLPORT` — component parts

### Grantkit Service — Railway

- **Service:** `grantkit` (connected to MySQL internally via `DATABASE_URL = MYSQL_URL`)
- **Public domain:** `grantkit-production-06f7.up.railway.app`
- **Variables set:** `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NODE_ENV`, `PORT`, `VITE_GOOGLE_MAPS_BROWSER_KEY`, `VITE_GOOGLE_MAPS_MAP_ID` (`889cfa3974b93649dcc6c265`)

> ⚠️ **`GOOGLE_MAPS_API_KEY` (server)** is **NOT** set on Railway because the batch geocoding script runs **ad-hoc from an operator's machine**, not from the Railway container. The operator exports it locally before running `pnpm geocode:grants`.

---

## 🛠️ Batch Geocoding — Local Operator Runbook

### When to run
- On demand (not scheduled). Typical triggers:
  1. Initial bulk geocode after Phase 2 pipeline reaches a live DB (first time)
  2. After a bulk import of new grants (`pnpm import:grants`) to geocode the new rows
  3. When `grants.latitude IS NULL` rows accumulate > ~50

### Prerequisites (one-time)
- Railway CLI installed: `npm i -g @railway/cli`
- Logged in: `railway login`
- Project linked: `railway link` → pick `lovely-forgiveness` / `production` / `grantkit`

### Running (PowerShell, Windows)

```powershell
# 1. Point DATABASE_URL at the PUBLIC MySQL URL, not the .internal one.
$env:DATABASE_URL = "<value of MYSQL_PUBLIC_URL from Railway MySQL service>"

# 2. Use the server key, NOT the browser key (browser key has referrer
#    restrictions → 403). Server key is named `grantkit-server-geocoding-v2`
#    in Google Cloud Console; "Show key" button reveals the value.
$env:GOOGLE_MAPS_API_KEY = "<value of grantkit-server-geocoding-v2>"

# 3. Always smoke-test 10 rows first.
pnpm geocode:grants:limit10

# 4. If success >= 80% → full pass.
pnpm geocode:grants
```

### Running (bash / zsh — macOS/Linux)

```bash
export DATABASE_URL="<MYSQL_PUBLIC_URL>"
export GOOGLE_MAPS_API_KEY="<grantkit-server-geocoding-v2 value>"
pnpm geocode:grants:limit10
pnpm geocode:grants
```

### Outputs
- `geocode-report.json` — per-run stats (success/fail counts, duration)
- `geocode-failed.json` — rows that failed, with attempted queries + reason
- `.grantkit-redesign/geocode-checkpoint.json` — resumable checkpoint every 50 rows

### Idempotency / safety
- Skips rows that already have `latitude` + `longitude` unless `--force`
- Checkpoint-resumes after crash/interrupt on the next run
- Halts if > 20% of a run fails (override with `--no-halt` or `--max-fail-rate=0.9`)

### Common errors

| Error                                                                   | Cause                                         | Fix                                                                 |
|-------------------------------------------------------------------------|-----------------------------------------------|---------------------------------------------------------------------|
| `ENOTFOUND mysql.railway.internal`                                      | Using internal URL from outside Railway       | Set `$env:DATABASE_URL` to `MYSQL_PUBLIC_URL` (not `MYSQL_URL`)     |
| `Places API 403: Requests from referer <empty> are blocked.`            | Using the HTTP-referrer-restricted browser key | Use the server key `grantkit-server-geocoding-v2` instead           |
| `Places API 403: This API is not enabled`                               | Key doesn't include Places API (New)          | In GCP Credentials → edit key → API restrictions → add Places API (New) + Geocoding API |
| `country mismatch (got GB, expected UK)` (or similar)                   | DB row has a non-ISO country code (e.g. `UK` instead of `GB`) | Run `pnpm normalize:countries:dry` to preview, then `pnpm normalize:countries`, then re-run `pnpm geocode:grants` |
| `PERMISSION_DENIED: billing`                                            | Billing not enabled on GCP project            | Enable billing on the Google Cloud project                          |

### Re-running geocoding after fixing data

1. Delete the local checkpoint so the pipeline re-scans every row:
   ```powershell
   Remove-Item .grantkit-redesign/geocode-checkpoint.json
   ```
   (On bash: `rm .grantkit-redesign/geocode-checkpoint.json`)
2. Run `pnpm geocode:grants` again. The `WHERE latitude IS NULL`
   filter skips every row that was geocoded successfully on the
   previous pass, so only the leftover failures are retried.
3. If fail rate still blocks the run (> 20%), add `--no-halt` once
   you've accepted that the remaining failures are unresolvable
   (e.g. address-less LLM-discovered stubs).

---

## 📞 Contact Enrichment — GitHub Action

Unlike geocoding (operator-driven), contact enrichment runs on a
GitHub Actions cron because the workload (50 orgs/day for ~11 days
to clear ~538 pending) is too tedious for manual operator runs.

- **Workflow:** `.github/workflows/contact-enrichment.yml`
- **Schedule:** every day 09:00 UTC (13:00 Tbilisi). Offset by 1 h from
  `daily-discovery.yml` (08:00 UTC) so the two jobs never share DB load.
- **Script:** `scripts/enrich-org-contacts.ts` — Google Places (New)
  Text Search + domain-validated email scraping. Anti-hallucination
  guard: emails are kept only if domain matches the org website.
- **Default batch size:** 50 orgs/day. Override via `workflow_dispatch`.

### Required GitHub Secrets (Settings → Secrets and variables → Actions)

| Secret | Source | Used by |
|---|---|---|
| `DATABASE_URL` | Railway → MySQL service → `MYSQL_PUBLIC_URL` | Already set (used by `daily-discovery.yml`) |
| `GOOGLE_MAPS_API_KEY` | Google Cloud → `grantkit-server-geocoding-v2` key value | **NEW — operator must add before first run** |

> ⚠️ `GOOGLE_MAPS_API_KEY` is the **server** key (IP-unrestricted), not
> the browser key. Same value the operator exports locally when running
> `pnpm geocode:grants`.

### Manual trigger (workflow_dispatch)

GitHub → Actions tab → "Contact Enrichment (Phase B)" → Run workflow.

Inputs:
- `limit` — orgs per batch (default 50)
- `dry_run` — skip DB writes, produce CSV/JSON only (default false)
- `force` — re-process already-enriched rows (default false; default
  query filter is `contactEnrichmentStatus = 'pending'`)

### Outputs (per run)

- `contact-enrichment-report.json` — stats + per-org outcomes
- `contact-enrichment-dry-run.csv` — only on `--dry-run`
- Uploaded as artifact: `contact-enrichment-<batch-id>` (30-day retention)

### First-run checklist

1. Operator adds `GOOGLE_MAPS_API_KEY` to GitHub repo secrets.
2. Trigger manually with `dry_run = true`, `limit = 10` — verify CSV output.
3. Trigger manually with `dry_run = false`, `limit = 50` — verify DB
   columns `phoneSource`, `phoneVerifiedAt`, etc. populated for the batch.
4. Leave the cron to drain remaining backlog (~538 / 50 ≈ 11 days).

---

## 🌍 Country-code Normalisation

The `grants.country` column stores **ISO 3166-1 alpha-2** codes
(`US`, `GB`, `DE`, …). A stale pattern in the LLM-driven
`daily-discovery.ts` pipeline sometimes wrote `UK` instead of `GB`,
and occasional full names like `United States` slipped through. Those
rows fail `geocode:grants` with `country mismatch (got GB, expected UK)`
because Google Places returns the ISO form while the script compared
against the raw DB value.

**Normaliser lives at `scripts/_lib/countryCodes.ts`** and is now
wired into `import-new-grants.ts` automatically, so new inserts use
the canonical form. For the existing DB:

```powershell
pnpm normalize:countries:dry   # preview what would change
pnpm normalize:countries       # apply — transactional, idempotent
```

The script touches only rows whose current value differs from the
normalised form. It's safe to run repeatedly.

---

## 📝 DO NOT do these (already done — skip)

These common first-time tasks have **already been completed** — don't redo:

- ❌ Create a server-side Google Maps API key → **done** (`grantkit-server-geocoding-v2`)
- ❌ Enable Places API (New) on the GCP project → **done**
- ❌ Enable Geocoding API on the GCP project → **done**
- ❌ Enable public networking on Railway MySQL → **done** (`MYSQL_PUBLIC_URL` exists)
- ❌ Link Railway project → **done** (user's workstation `lovely-forgiveness` / `production` / `grantkit`)

---

## 🗺️ Deployment — Railway

The full deployment story lives in `CLAUDE.md`. Short version:

- **One Railway service** hosts both Express backend + Vite-built React SPA
- MySQL plugin shares the same Railway project
- `git push origin main` → auto-deploys via Railway's GitHub integration
- Manual redeploy: `railway up` from local

---

## 🔒 Secret rotation — when to do it

Rotate any credential that has ever appeared in:
- A Claude Code session log (local transcript at `/root/.claude/projects/...`)
- A screenshot shared in Slack/Discord/email
- An accidentally-pushed commit (check history)

**Recommended rotation cadence:**
- Google Maps server key: after each bulk operator session
- MySQL root password: yearly, or immediately after any suspected leak
- Anthropic API key: if ever shared or leaked

Rotation steps:
1. Google Cloud → Credentials → key → **Regenerate** → update Railway variable + local script runs
2. Railway MySQL → Settings → Reset root password → update any external tools holding the old URL
3. Anthropic Console → API Keys → Revoke → Create new → update Railway variable
