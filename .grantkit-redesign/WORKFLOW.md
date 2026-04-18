# Agent Workflow Protocol

## At the start of EVERY phase

1. Read `.grantkit-redesign/STATE.md` (full)
2. Read `.grantkit-redesign/TEAM_ROSTER.md` (your assigned persona)
3. Read `CLAUDE.md` (project rules)
4. Verify current phase status is ⚪ Not started (don't re-execute
   complete phases)
5. Change phase status to 🟡 In progress in STATE.md
6. Embody assigned persona fully for this session

## During the phase

- Follow project rules from CLAUDE.md strictly
- Read files before editing (no blind writes)
- Run `pnpm check` after each meaningful change
- Commit progress mentally to the phase log — don't wait until end

## At the end of EVERY phase

1. Run `pnpm check` — zero TypeScript errors
2. Run `pnpm build` — clean build
3. Update STATE.md:
   - Change phase status to 🟢 Complete
   - Fill in "Completed" column with ISO date
   - Write detailed phase log: files changed, key decisions,
     non-obvious work done
   - Add row to Change Log at bottom
4. If blocked, change status to 🔴 Blocked, add to "Active Blockers"
   with specifics
5. Final self-check: if another agent read STATE.md now, would they
   know exactly where to continue?

## Forbidden

- ❌ Starting a phase without reading STATE.md
- ❌ Marking a phase complete with failing tests
- ❌ Editing code from a phase not currently assigned
- ❌ Ignoring CLAUDE.md rules (pnpm only, relative tRPC URL, etc.)
- ❌ Silent blockers (if stuck, LOG IT)
