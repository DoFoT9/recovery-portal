#!/usr/bin/env bash
# Create a timestamped backup of the data directory (DB + videos + branding).
set -euo pipefail

DATA_DIR="${DATA_DIR:-./data}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

if [[ ! -d "$DATA_DIR" ]]; then
  echo "✗ Data directory $DATA_DIR not found"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
OUT="$BACKUP_DIR/recovery-portal-${TIMESTAMP}.tar.gz"

echo "  → Archiving $DATA_DIR ..."
tar -czf "$OUT" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"

SIZE=$(du -h "$OUT" | cut -f1)
echo "✓ Backup written: $OUT ($SIZE)"
echo ""
echo "  Copy this file off the server (S3, B2, encrypted USB, etc) for disaster recovery."
