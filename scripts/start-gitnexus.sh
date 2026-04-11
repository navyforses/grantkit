#!/usr/bin/env bash
# start-gitnexus.sh — Index the GrantKit codebase and launch the GitNexus web UI
#
# Usage:
#   bash scripts/start-gitnexus.sh          # index + start web UI
#   bash scripts/start-gitnexus.sh --force  # re-index + start web UI
#   pnpm gitnexus:analyze                   # index only
#   pnpm gitnexus:serve                     # web UI only (port 4747)
#
# The MCP server for Claude Code is configured in .mcp.json and starts
# automatically via stdio — no manual server launch needed.
#
# NOTE: LadybugDB (GitNexus graph database) requires ~8TB virtual address
# space via mmap. This works on standard Linux/macOS machines but may fail
# in containerized environments with restricted mmap. If you see "Mmap for
# size 8796093022208 failed", run on your local machine instead.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Check if gitnexus is available
if ! npx gitnexus --version >/dev/null 2>&1; then
  echo "ERROR: gitnexus is not installed. Run 'pnpm install' first." >&2
  exit 1
fi

# Index if not already done or if --force flag is passed
if [ ! -d ".gitnexus" ] || [ "${1:-}" = "--force" ]; then
  echo "Indexing GrantKit codebase with GitNexus..."
  echo "  Add --embeddings flag to gitnexus:analyze for semantic search support"
  npx gitnexus analyze
  echo ""
  echo "Index created in .gitnexus/"
else
  echo "GitNexus index found. Use --force to re-index."
fi

echo ""
echo "Starting GitNexus web UI on http://127.0.0.1:4747"
npx gitnexus serve --port 4747
