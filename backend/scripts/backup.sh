#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-steel_agent}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

mkdir -p "$BACKUP_DIR"

FILENAME="steel_agent_backup_$(date +%Y%m%d).sql"
FILEPATH="$BACKUP_DIR/$FILENAME"

echo "[Backup] Starting database backup..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$FILEPATH"

if [ $? -eq 0 ]; then
    echo "[Backup] Backup created: $FILEPATH"
    # Clean up backups older than 30 days
    find "$BACKUP_DIR" -name "steel_agent_backup_*.sql" -mtime +30 -delete
    echo "[Backup] Old backups cleaned up"
else
    echo "[Backup] Backup failed!"
    exit 1
fi
