#!/usr/bin/env bash
# start-toolbox.sh — Start the googleapis/mcp-toolbox MCP server for GrantKit admin use
#
# Usage:
#   bash scripts/start-toolbox.sh
#   pnpm toolbox:start
#
# Requires DATABASE_URL to be set (Railway format: mysql://user:password@host:port/database)
# Loads .env automatically if present in the project root.

set -euo pipefail

# ---------------------------------------------------------------------------
# 1. Load .env if present
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$PROJECT_ROOT/.env"
  set +a
fi

# ---------------------------------------------------------------------------
# 2. Parse DATABASE_URL → individual MYSQL_* env vars
#
#    Railway format: mysql://user:password@host:port/database
#    or:             mysql://user:password@host:port/database?ssl-mode=require
# ---------------------------------------------------------------------------
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Please set it in .env or your environment." >&2
  exit 1
fi

URL="${DATABASE_URL#mysql://}"        # strip "mysql://"
URL="${URL#*://}"                     # strip any leftover scheme (e.g. mysql+ssl://)

export MYSQL_USER="${URL%%:*}"        # everything before the first ":"
URL="${URL#*:}"
export MYSQL_PASSWORD="${URL%%@*}"    # everything before the "@"
URL="${URL#*@}"
export MYSQL_HOST="${URL%%:*}"        # hostname
URL="${URL#*:}"
export MYSQL_PORT="${URL%%/*}"        # port
URL="${URL#*/}"
export MYSQL_DATABASE="${URL%%\?*}"   # database name, strip query params

echo "Connecting to MySQL:"
echo "  Host:     $MYSQL_HOST:$MYSQL_PORT"
echo "  Database: $MYSQL_DATABASE"
echo "  User:     $MYSQL_USER"

# ---------------------------------------------------------------------------
# 3. Download the toolbox binary if not already present
# ---------------------------------------------------------------------------
TOOLBOX="$PROJECT_ROOT/toolbox"
VERSION="0.7.0"

if [ ! -f "$TOOLBOX" ]; then
  echo ""
  echo "Downloading mcp-toolbox v${VERSION}..."

  RAW_OS="$(uname -s)"
  case "$RAW_OS" in
    Linux)  OS="linux" ;;
    Darwin) OS="darwin" ;;
    *)
      echo "ERROR: Unsupported OS: $RAW_OS" >&2
      echo "Download manually from: https://github.com/googleapis/mcp-toolbox/releases/tag/v${VERSION}" >&2
      exit 1
      ;;
  esac

  RAW_ARCH="$(uname -m)"
  case "$RAW_ARCH" in
    x86_64)  ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    arm64)   ARCH="arm64" ;;
    *)
      echo "ERROR: Unsupported architecture: $RAW_ARCH" >&2
      exit 1
      ;;
  esac

  DOWNLOAD_URL="https://github.com/googleapis/mcp-toolbox/releases/download/v${VERSION}/toolbox_${OS}_${ARCH}"
  echo "  From: $DOWNLOAD_URL"
  curl -fsSL -o "$TOOLBOX" "$DOWNLOAD_URL"
  chmod +x "$TOOLBOX"
  echo "  Saved to: $TOOLBOX"
fi

# ---------------------------------------------------------------------------
# 4. Start the toolbox MCP server
# ---------------------------------------------------------------------------
cd "$PROJECT_ROOT"

echo ""
echo "Starting mcp-toolbox on http://127.0.0.1:5000"
echo "MCP endpoint: http://127.0.0.1:5000/mcp"
echo "Press Ctrl+C to stop."
echo ""

exec "$TOOLBOX" --tools-file tools.yaml "$@"
