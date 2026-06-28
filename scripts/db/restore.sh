#!/bin/bash
# TradeZen Database Restore Script
# Usage: ./scripts/restore.sh <backup_file>

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/restore.sh <backup_file>"
  echo "Available backups:"
  ls -la ./backups/tradezen_*.sql.gz 2>/dev/null || echo "No backups found"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled"
  exit 1
fi

echo "Restoring database..."
docker exec -i tradezen-db psql -U postgres -d tradezen < <(gunzip -c "$BACKUP_FILE")

echo "Restore completed successfully"
