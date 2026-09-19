# Agent Workflow Protocol (v2 — integration pivot, 2026-09-19)

> Source of these rules: `integration-pivot/00-MASTER-PLAN.md` §5 (phase rules), §6.1 (personas), §6.3 (manager protocol) and `PIVOT.md` §6 (agent protocol). A persona is a Claude Code session, not a person (`TEAM_ROSTER.md`).

## At the start of EVERY session

Reading order (fixed):

1. `.grantkit-redesign/KARPATHY_GUIDELINES.md` — behaviour filter #0
2. `CLAUDE.md` — project rules
3. `.grantkit-redesign/PROJECT_MAP.md` — living map + **Session Log** (the only log; `STATE.md` is archived)
4. `.grantkit-redesign/OPS.md` — what already exists before asking the operator for anything
5. `.grantkit-redesign/TEAM_ROSTER.md` — your persona: what you own, what you do not touch
6. `.grantkit-redesign/PIVOT.md` — §3 where we are, §4 open owner decisions, §6 agent protocol
7. `integration-pivot/00-MASTER-PLAN.md` §5 — the current phase table; take **one** deliverable and its "done when"

Then: verify the deliverable is not already done (Session Log + `git log`), state your assumptions, and embody the persona fully.

## During the session

- One deliverable per branch; branch name carries the phase item (e.g. `phase0/0.6-docs-ssot`).
- Read files before editing; run `pnpm check` after each meaningful change.
- **PR ≤ 300 changed lines** (i18n dictionaries and generated files excluded), one concern per PR; "refactor while here" is forbidden (Karpathy §3).
- **Schema PR is always separate** from code PRs and is merged **only after** its migration ran on Railway and `SELECT <new-column>` was verified (CLAUDE.md golden rule).
- **No parallel PRs on the same file owner:** two open PRs must not touch files owned by the same persona (`TEAM_ROSTER.md` "owns" column). ≤ 3 open PRs at any time.
- Evidence order when sources disagree: (1) this session's command output > (2) `audit-reports/*` + live DB query > (3) code read by line > (4) `PROJECT_MAP` / `OPS` > (5) any other `.grantkit-redesign/*.md` > (6) memory / assumption.
- Numbers are never typed by hand into docs — cite `pnpm audit:db` output / `STATUS.json` with a date.

## Review gates (who must review before merge)

| Files | Reviewer |
|---|---|
| `server/_core/*`, `.github/workflows/*`, `Dockerfile` | Mira |
| `server/db.ts`, `drizzle/schema.ts`, `server/routers.ts` | Dmitri |
| `client/src/i18n/*` | Lila (5-language parity, ka native) |
| `client/src/pages/*` | Kwame |
| `server/billing/*`, `server/entitlements.ts` | Mira + Dmitri |
| `reports/finance/*` | Nika |
| **No-monetization-zone gate:** `server/offers/*`, `content/offers-allowlist.json`, `content/offers/*.json` | **Salomé + Mira, both.** A monetization PR does not merge without its "never" tests (MASTER-PLAN v2 §2.5): `legal_status`, `health` (emergency / free clinic / asylum insurance), `mental_health`, `safety_rights`, `housing.emergency_shelter`, `family_children.women_gbv`, NGO/public org pages, print view, AI chat, `commercial: false` guides, client status `asylum_seeker` / `undocumented` → **0 offers regardless of allowlist**. Adding a domain to the allowlist = owner escalation. |
| Every PR | Ilias release checklist: CI green, done-when output in PR body, Session Log line |

## At the end of EVERY session

1. `pnpm check` — zero TypeScript errors; `pnpm build` — clean; `pnpm test` — green.
2. PR body: done-when status (✓/✗ with the command output), facts marked `[✓]` / `[estimate]`, what could not be verified.
3. `PROJECT_MAP.md` **Session Log**: append 3 lines (date, what shipped / what is live, what is blocked). Bump "Last updated".
4. `PIVOT.md` §3: update only if the phase, blocker, revenue or cost changed. §7 status journal is append-only.
5. Blocked? Say so in the Session Log line and the PR body with owner + what unblocks it. Never a silent blocker.
6. Final self-check: could the next session continue from the Session Log alone?

## Escalate to the owner only for

Money / price; brand / name; legal exposure (status data, AI advice, "verified" claims); dropping a column or table; hard delete or > 100-row deactivate; git history rewrite; new country or language; external cost > €100; **new monetization surface, allowlist domain, partner contract, grant application** (MASTER-PLAN v2 §6.3).

## Forbidden

- ❌ Starting work without the reading order above
- ❌ Marking a deliverable done with failing `check` / `build` / `test`
- ❌ Editing files owned by another persona without that persona's review
- ❌ Merging a schema PR before its migration ran on Railway
- ❌ Rendering any partner / Pro / paid CTA outside `server/offers/placement.ts` `selectOffers()`
- ❌ Ignoring CLAUDE.md rules (pnpm only, relative tRPC URL, 5-language i18n, `stage*.cjs` untouched)
- ❌ Silent blockers, hand-typed numbers, PII in `reports/finance/*`
