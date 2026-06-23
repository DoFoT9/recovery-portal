#!/usr/bin/env bash
# Restore data directory from a backup archive.
# Usage: ./scripts/restore.sh path/to/backup.tar.gz
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 path/to/backup.tar.gz"
  exit 1
fi

ARCHIVE="$1"
DATA_DIR="${DATA_DIR:-./data}"

if [[ ! -f "$ARCHIVE" ]]; then
  echo "✗ Archive $ARCHIVE not found"
  exit 1
fi

echo ""
echo "  WARNING: This will REPLACE the current contents of $DATA_DIR"
echo "  with the contents of $ARCHIVE."
echo ""
read -p "  Type RESTORE to continue: " confirm
if [[ "$confirm" != "RESTORE" ]]; then
  echo "  Aborted."
  exit 1
fi

if [[ -d "$DATA_DIR" ]]; then
  SIDELINE="${DATA_DIR}.replaced-$(date -u +%Y%m%d-%H%M%S)"
  mv "$DATA_DIR" "$SIDELINE"
  echo "  ✓ Existing data moved aside to $SIDELINE"
fi

mkdir -p "$(dirname "$DATA_DIR")"
tar -xzf "$ARCHIVE" -C "$(dirname "$DATA_DIR")"
echo "  ✓ Restored from $ARCHIVE"
echo ""
echo "  Restart the app to pick up the restored data."
echo "  If anything looks wrong, the previous data is in $SIDELINE."
