# Migration Drift — Production vs schema.ts

> Generated 2026-05-03 — follows up Phase 4 audit (PR #206) finding that `users.emailVerified` and `users.lockedUntil` were missing on production.

## Root cause

`schema.ts` is ahead of the production DB by **at least migration 0011** (email/password auth). The migration file `drizzle/0011_volatile_demogoblin.sql` exists in the repo but was never executed against Railway MySQL.

Symptoms during Phase 4 audit:
- `Unknown column 'emailVerified' in 'field list'`
- `Unknown column 'lockedUntil' in 'field list'`

CLAUDE.md says "Phase 0 ✅ done" but DB never received the columns. The auth code was deployed, just nothing tried to query these columns until the audit ran.

## What 0011 adds to `users`

| Column | Type | Default |
|---|---|---|
| `passwordHash` | VARCHAR(255) | NULL |
| `emailVerified` | BOOLEAN | false NOT NULL |
| `verificationToken` | VARCHAR(100) | NULL |
| `verificationTokenExpires` | TIMESTAMP | NULL |
| `resetPasswordToken` | VARCHAR(100) | NULL |
| `resetPasswordTokenExpires` | TIMESTAMP | NULL |
| `failedLoginAttempts` | INT | 0 NOT NULL |
| `lockedUntil` | TIMESTAMP | NULL |

Plus 3 indexes: `users_email_idx`, `users_verification_token_idx`, `users_reset_token_idx`.

## Fix

Run the new idempotent apply script with operator's `MYSQL_PUBLIC_URL`:

```bash
# 1. dry-run — see what would change
DATABASE_URL="$MYSQL_PUBLIC_URL" node scripts/apply-migration-0011.mjs

# 2. execute
DATABASE_URL="$MYSQL_PUBLIC_URL" node scripts/apply-migration-0011.mjs --apply
```

The script:
- Reads existing `users` columns first (idempotent — skips columns that already exist)
- Same for indexes
- Defaults to dry-run; requires `--apply` to mutate
- Prints per-statement progress
- Verifies critical columns post-execute

## What about 0010 / 0012?

- **0010** (`slow_sleeper`) — adds onboarding fields to users. Status: unknown — no audit ran against these columns. Likely already applied (project ran for months with onboarding working). Recommend running `node scripts/apply-migration-0010.mjs` (or equivalent) in dry-run to verify.
- **0012** (`mean_kree`) — adds geocoding fields to grants. Status: unknown. Same recommendation.

After 0011 lands, suggest auditing 0010 + 0012 the same way: `SHOW COLUMNS FROM <table>` against production and compare to schema.ts.

## Lessons

The CLAUDE.md "Migration golden rule" exists exactly for this scenario:
> Always run migration on Railway BEFORE merging schema changes.

It was bypassed for 0011 (probably because the auth feature was developed locally with `pnpm db:push` against a dev DB, then the PR merged without the corresponding `apply-migration-0011.mjs` operator step). The new script restores the golden-rule workflow for past drift.

## Future-proofing

Add a CI step that runs against the production DB:

```sql
-- Check for schema drift weekly
SELECT
  COUNT(*) as expected_columns
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME IN ('emailVerified', 'lockedUntil', 'passwordHash');
-- If < 3, alert
```

This would have caught 0011 drift the day after it merged.
