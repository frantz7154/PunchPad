#!/usr/bin/env bash
set -euo pipefail
DATE=$(date -u +%F)
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-punchpad}" "${POSTGRES_DB:-punchpad}" \
  | gzip > "$OUT_DIR/punchpad-${DATE}.sql.gz"
# Retain 14 days
find "$OUT_DIR" -name 'punchpad-*.sql.gz' -mtime +14 -delete
echo "Backup written: $OUT_DIR/punchpad-${DATE}.sql.gz"
