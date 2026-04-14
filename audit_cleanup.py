#!/usr/bin/env python3
"""
GrantKit audit/db log cleanup utility.

Features:
- prints a short summary of db-query-error JSON files
- archives old JSON logs from .manus/db into .manus/db/archive/YYYY-MM-DD
- supports dry-run mode
"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

DB_LOG_DIR = Path(".manus/db")
ARCHIVE_ROOT = DB_LOG_DIR / "archive"


def iter_db_json_logs(root: Path) -> Iterable[Path]:
    if not root.exists():
        return []
    return sorted(p for p in root.glob("*.json") if p.is_file())


def parse_error_log(path: Path) -> dict[str, str]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        return {"file": path.name, "error": f"Invalid JSON: {exc}", "query": ""}

    error = payload.get("error") or payload.get("message") or "Unknown error"
    query = payload.get("query") or ""
    return {"file": path.name, "error": str(error), "query": str(query)}


def print_error_summary(root: Path) -> None:
    error_files = sorted(root.glob("db-query-error-*.json"))
    if not error_files:
        print("No db-query-error-*.json files found.")
        return

    print(f"Found {len(error_files)} db-query-error files:")
    for path in error_files:
        info = parse_error_log(path)
        query_preview = " ".join(info["query"].split())[:120]
        print(f"- {info['file']}: {info['error']} | query: {query_preview}")


def archive_old_logs(root: Path, archive_root: Path, retention_days: int, dry_run: bool) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    archived = 0

    for path in iter_db_json_logs(root):
        modified = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
        if modified >= cutoff:
            continue

        archive_dir = archive_root / modified.strftime("%Y-%m-%d")
        destination = archive_dir / path.name

        if dry_run:
            print(f"[DRY RUN] archive {path} -> {destination}")
        else:
            archive_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(path), str(destination))
            print(f"Archived {path.name} -> {destination}")
        archived += 1

    return archived


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Cleanup .manus/db logs")
    parser.add_argument("--retention-days", type=int, default=7, help="Keep logs newer than this many days (default: 7)")
    parser.add_argument("--dry-run", action="store_true", help="Show actions without moving files")
    parser.add_argument("--no-summary", action="store_true", help="Skip db-query-error summary")
    return parser


def main() -> int:
    args = build_parser().parse_args()

    if not DB_LOG_DIR.exists():
        print(f"Log directory not found: {DB_LOG_DIR}")
        return 0

    if not args.no_summary:
        print_error_summary(DB_LOG_DIR)

    archived_count = archive_old_logs(
        root=DB_LOG_DIR,
        archive_root=ARCHIVE_ROOT,
        retention_days=args.retention_days,
        dry_run=args.dry_run,
    )
    print(f"Archived files: {archived_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
