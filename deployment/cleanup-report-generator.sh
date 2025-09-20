#!/usr/bin/env bash
# Generate a report of likely redundant or orphaned files in the repository root
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORT="$ROOT_DIR/deployment/cleanup-report.txt"

echo "Generating cleanup report at $REPORT"
rm -f "$REPORT"

echo "=== Large files (>1MB) ===" >> "$REPORT"
find "$ROOT_DIR" -type f -size +1M -printf "%s %p\n" | sort -nr >> "$REPORT"

echo "\n=== .env backups and related ===" >> "$REPORT"
find "$ROOT_DIR" -type f -name ".env*" ! -name ".env.example" -print >> "$REPORT"

echo "\n=== .pyc / __pycache__ ===" >> "$REPORT"
find "$ROOT_DIR" -type d -name "__pycache__" -print >> "$REPORT"
find "$ROOT_DIR" -type f -name "*.pyc" -print >> "$REPORT"

echo "\n=== Possible duplicate README / docs copies ===" >> "$REPORT"
grep -R --line-number "PITCH_VENDORA|PITCH_ORDER_FLOW" "$ROOT_DIR" | head -n 50 >> "$REPORT" || true

echo "\n=== Unused scripts under backend/scripts ===" >> "$REPORT"
ls -1 "$ROOT_DIR/backend/scripts" 2>/dev/null || true

echo "Report generated. Review before deleting any files." >> "$REPORT"

echo "Done. Open $REPORT to review."