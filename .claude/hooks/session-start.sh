#!/bin/bash
#
# session-start.sh — injects PROJECT_MAP.md + OPS reminder at session start.
#
# Purpose: guarantee every Claude session (local or web) loads the project's
# wide-view map BEFORE touching any code or asking the user for setup. This
# prevents the class of "ask for API key that already exists" mistakes by
# making the canonical project state impossible to miss.
#
# Stdout is consumed by Claude Code and becomes part of the session context.
# Keep this fast (<1s) — it runs synchronously before the session starts.

set -euo pipefail

MAP_FILE="$CLAUDE_PROJECT_DIR/.grantkit-redesign/PROJECT_MAP.md"
OPS_FILE="$CLAUDE_PROJECT_DIR/.grantkit-redesign/OPS.md"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║ 🛑 SESSION-START AUTO-CONTEXT — GrantKit                          ║"
echo "║                                                                  ║"
echo "║ You MUST read the project map below before any action.           ║"
echo "║ Before asking the user for API keys / env vars / setup tasks,    ║"
echo "║ grep .grantkit-redesign/OPS.md FIRST — it likely already exists. ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo

if [ -f "$MAP_FILE" ]; then
  echo "━━━ PROJECT_MAP.md (auto-loaded) ━━━"
  echo
  cat "$MAP_FILE"
  echo
  echo "━━━ end PROJECT_MAP.md ━━━"
else
  echo "⚠️  .grantkit-redesign/PROJECT_MAP.md is missing. Create it before proceeding."
fi

echo
if [ -f "$OPS_FILE" ]; then
  echo "ℹ️  Full operational details: .grantkit-redesign/OPS.md ($(wc -l < "$OPS_FILE") lines). Grep it before asking the user for setup."
fi
