#!/bin/bash
# TradeZen Database Backup Script
# Usage: ./scripts/backup.sh [backup_dir]

set -e

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/tradezen_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
echo "Backup file: $BACKUP_FILE"

# Run pg_dump inside the container
docker exec tradezen-db pg_dump -U postgres -d tradezen --clean --if-exists | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup completed successfully: $BACKUP_SIZE"
else
  echo "ERROR: Backup file is empty or missing"
  exit 1
fi

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "tradezen_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Backup complete. Total backups: $(ls -1 "$BACKUP_DIR"/tradezen_*.sql.gz 2>/dev/null | wc -l)"
