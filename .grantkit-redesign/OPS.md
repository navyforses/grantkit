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
  - `MYSQL_PUBLIC_URL` — public (`<MYSQL_PUBLIC_URL host:port>`) — for external tooling like `pnpm geocode:grants`
  - `MYSQL_ROOT_PASSWORD`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLHOST`, `MYSQLPORT` — component parts

### Grantkit Service — Railway

- **Service:** `grantkit` (connected to MySQL internally via `DATABASE_URL = MYSQL_URL`)
- **Public domain:** `grantkit-production-06f7.up.railway.app`
- **Variables set:** `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NODE_ENV`, `PORT`, `VITE_GOOGLE_MAPS_BROWSER_KEY`, `VITE_GOOGLE_MAPS_MAP_ID` (`889cfa3974b93649dcc6c265`)

> ⚠️ **`GOOGLE_MAPS_API_KEY` (server)** is **NOT** set on Railway because the batch geocoding script runs **ad-hoc from an operator's machine**, not from the Railway container. The operator exports it locally before running `pnpm geocode:grants`.

#### Railway env var names — `grantkit` service (names only, never values)

Source of truth for what the app reads: `server/_core/env.ts` plus the direct
`process.env` / `import.meta.env` reads listed. "Present per OPS 2026-05 list"
= whether the name appeared in the **Variables set** line above when it was
written (2026-05); `unknown` = never verified in the Railway dashboard —
checking it is an operator P0 item (`PIVOT.md` §5).

| Name | Required? | Used by | Present per OPS 2026-05 list |
|---|---|---|---|
| `DATABASE_URL` | required | `server/_core/env.ts`, `server/db.ts`, `server/migrate.ts` | yes |
| `NODE_ENV` | required (`production`; set in `Dockerfile`) | `server/_core/env.ts`, `server/_core/bootstrap.ts`, `static.ts`, `trpc.ts`, `vite.ts`, `server/grantAssistant.ts`, `server/paddleWebhook.ts` | yes |
| `PORT` | required (`8080`; default in `Dockerfile`) | `server/_core/bootstrap.ts` | yes |
| `JWT_SECRET` | required — signs the auth cookie | `server/_core/env.ts` → `server/_core/sdk.ts` | no |
| `ANTHROPIC_API_KEY` | required for AI assistant + smart search | `server/_core/env.ts` → `server/grantAssistant.ts`, `server/queryExpander.ts`, `server/toolboxClient.ts` | yes |
| `RESEND_API_KEY` | optional — transactional + newsletter email | `server/_core/env.ts` → `server/emailService.ts` | no |
| `PADDLE_API_KEY` | optional — only if D2 keeps billing | `server/_core/env.ts` (read; no consumer in `server/` today) | no |
| `PADDLE_WEBHOOK_SECRET` | optional — only if D2 keeps billing | `server/_core/env.ts` → `server/paddleWebhook.ts` | unknown — operator P0 check (`PIVOT.md` §5) |
| `BUILT_IN_FORGE_API_URL` | optional — Forge / GrantedAI helpers | `server/_core/env.ts` → `server/_core/llm.ts`, `dataApi.ts`, `map.ts`, `imageGeneration.ts`, `notification.ts`, `voiceTranscription.ts`, `server/storage.ts` | no |
| `BUILT_IN_FORGE_API_KEY` | optional — same | same files | no |
| `APP_URL` | optional — falls back to the hard-coded Railway URL | `server/_core/env.ts` → `server/routers.ts` | no |
| `RAILWAY_PUBLIC_DOMAIN` | optional — Railway injects it; code falls back to the hard-coded URL | `server/emailService.ts`, `server/seoRoutes.ts` | unknown (Railway-provided) |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | required for maps — **build-time** (`Dockerfile` `ARG`, baked into the SPA bundle) | `client/src/lib/googleMapsLoader.ts`, `Dockerfile` | yes |
| `VITE_GOOGLE_MAPS_MAP_ID` | optional — build-time | `client/src/lib/googleMapsLoader.ts`, `Dockerfile` | yes |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | legacy — `Dockerfile` `ARG`s with no reader in `client/src` | `Dockerfile` only | no |
| `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` | optional — planned (Umami, Phase 0 item 0.10); today only a comment | `client/index.html` (comment) | no |

**Not Railway variables** (scripts / GitHub Secrets / operator machine only —
do not add them to the service): `GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`,
`VITE_GOOGLE_MAPS_API_KEY` (`scripts/geocode-*.ts`, `scripts/enrich-org-contacts.ts`,
`scripts/verify-api-keys.ts`), `ENRICHMENT_API_URL`, `ENRICHMENT_API_KEY`
(`scripts/daily-discovery.ts`, `scripts/import-new-grants.ts` — GitHub Secrets),
`TEMP_ADMIN_EMAIL` / `TEMP_ADMIN_PASSWORD` / `TEMP_ADMIN_NAME`
(`scripts/create-temp-admin.ts`), `ANALYZE` (`vite.config.ts` bundle analyzer, local).

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
- **Schedule:** ⏸️ **paused since 2026-09-18** — the cron ran 130 days in a
  row and failed every time because `GOOGLE_MAPS_API_KEY` was never added
  to GitHub Secrets. The `schedule:` block is commented out in the
  workflow file; only `workflow_dispatch` remains. Re-enable it after
  completing the first-run checklist below (was: every day 09:00 UTC,
  offset by 1 h from `daily-discovery.yml` so the two jobs never share
  DB load).
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
4. Uncomment the `schedule:` block in `contact-enrichment.yml` and let the
   cron drain the remaining backlog (~538 / 50 ≈ 11 days).

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
- **Dockerfile pins pnpm** (`npm install -g pnpm@10.33.2`, same as
  `packageManager` in `package.json`). Do not unpin: an unpinned install pulls
  the newest pnpm major, which tries to self-switch to 10.33.2 via the
  `@pnpm/exe` native binary — none exists for Alpine (linux-x64-musl) and the
  Railway build dies with `ERR_PNPM_PNPM_ENGINE_NO_NATIVE_BINARY` (this broke
  every deploy 2026-08-12 → 2026-09-18). When bumping `packageManager`, bump
  both `RUN npm install -g pnpm@…` lines in the Dockerfile too.

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

### History rewrite (D3) — run only after owner decides D3

> ⛔ **Do not run until `PIVOT.md` §4 has a dated answer for D3.** History
> rewrite is owner-only (`PIVOT.md` §6 rule 7).
>
> What is in history: the production MySQL root password in the PowerShell
> `<pw-assignment pattern>` line of
> `.grantkit-redesign/AUDIT-CONTINUATION-2026-05-03.md`, introduced in
> `45155f7` (2026-05-03), redacted at HEAD in `951e363` (PR #247). Concrete
> `MYSQL_PUBLIC_URL` host:port strings (docs since 2026-04-22) and the Google
> Maps browser key (Lighthouse reports, 2026-05-03) were redacted at HEAD by
> the `chore(security)` purge PR. A rewrite is **in addition to** rotation,
> never instead of it — the values are compromised either way.

#### D3 = (a) purge + rotation + history rewrite

Preconditions
1. Rotation done (steps 1–3 above): Railway MySQL root reset, both Maps keys
   regenerated; old values verified dead (`Access denied` / HTTP 403).
2. Repo is private and collaborators ≤ 3 (the (a) recommendation); every
   collaborator told about the push-freeze window.
3. All open PRs merged, or their branches noted for re-creation.
4. `git filter-repo` installed on the operator machine
   (`pip install git-filter-repo`; needs git ≥ 2.22). It is **not** installed
   in the Claude sandbox and cannot run there (shallow clone, no push).

Steps (operator machine, bash)

```bash
# 1. Fresh mirror clone — never rewrite inside a working clone or a worktree.
git clone --mirror https://github.com/navyforses/grantkit.git grantkit-rewrite.git
cd grantkit-rewrite.git

# 2. Expressions file OUTSIDE the repo (never commit it; shred it afterwards).
#    One line per secret:  literal:<old value>==><replacement>
#    Take the old values from the Railway / GCP dashboards, NOT from any doc.
cat > ~/grantkit-purge.txt <<'EOF'
literal:<old MySQL root password>==><REDACTED-BY-FILTER-REPO>
literal:<old MYSQL_PUBLIC_URL host:port, 1st port>==><MYSQL_PUBLIC_URL host:port>
literal:<old MYSQL_PUBLIC_URL host:port, 2nd port>==><MYSQL_PUBLIC_URL host:port>
literal:<old Google Maps browser key>==><REDACTED_GOOGLE_MAPS_BROWSER_KEY>
EOF
# Which old host:port strings existed (bare host from the Railway dashboard):
#   git log -p -S'<MYSQL_PUBLIC_URL host>' -- '*.md'

# 3. Dry run first — writes only to .git/filter-repo/, changes nothing.
git filter-repo --replace-text ~/grantkit-purge.txt --dry-run

# 4. Real run — rewrites every branch and tag; drops the `origin` remote on purpose.
git filter-repo --replace-text ~/grantkit-purge.txt

# 5. Verify nothing is left anywhere in history.
git log --all -S'<old MySQL root password>' --oneline | wc -l   # → 0
git log --all -S'<old MYSQL_PUBLIC_URL host:port>' --oneline | wc -l   # → 0 (repeat per old port)
git log --all -S'AIza' --oneline | wc -l                          # → 0

# 6. Force-push all refs. GitHub: Settings → Branches → `main` rule →
#    temporarily enable "Allow force pushes" (or bypass as admin), then re-disable.
git remote add origin https://github.com/navyforses/grantkit.git
git push --force --mirror origin

# 7. Clean up the expressions file.
shred -u ~/grantkit-purge.txt   # macOS: rm -P
```

After the push
- **Every collaborator re-clones.** `git pull` / `git merge` on an old clone
  re-introduces the old objects — delete the old clone (and its worktrees)
  first. Open branches: `git rebase --onto` the new `main`, or re-create from
  a patch.
- **GitHub still caches the old objects** (PR diffs, `commit/<sha>` URLs,
  forks, Compare views). Open a GitHub Support ticket ("remove sensitive data
  — cached views / dangling commits"), list the old SHAs (`45155f7`,
  `6f2ace6`, `cb67d0f`, `951e363`, and the pre-rewrite `main` head), and ask
  for a server-side gc. Delete every fork you control.
- GitHub Actions runs whose logs/artifacts printed a value: delete those runs.
- Railway deploys from the `main` head, so it is unaffected — still check that
  the next auto-deploy is green.
- Record in `PIVOT.md` §7 and `PROJECT_MAP.md` Session Log: date,
  old → new `main` SHA, support ticket number.

#### D3 = (b) purge + rotation only (no rewrite)

- Rotation (steps 1–3 above) is what neutralises the leak; the doc purge
  (PR #247 + the `chore(security)` purge PR) keeps HEAD clean. The old
  password stays in history from `45155f7` to `951e363` — dead, but readable
  to anyone with repo access.
- Record the accepted residual in the `PIVOT.md` §4 D3 answer: "(b) — value
  rotated on <date>; remains in history, harmless".
- Shrink who can read history: keep the repo private; prune stale
  collaborators, deploy keys and personal tokens (Settings → Collaborators,
  Deploy keys).
- Prevent a repeat: GitHub Settings → Code security → enable **secret
  scanning + push protection**; the Phase 0 CI PR adds `git grep` guards for
  the `<MYSQL_PUBLIC_URL host>` literal and the `<pw-assignment pattern>`.
- If the repo is ever made public, or a fork/leak is suspected → switch to (a).
