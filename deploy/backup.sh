#!/bin/bash
# deploy/backup.sh - Daily backup script for IKIGAI X-ONE sessions data
# Run this script from cron to create timestamped backups of sessions.json

# Configuration
DATA_FILE="data/sessions.json"
BACKUP_DIR="data/backups"
MAX_BACKUPS=30  # Maximum number of backups to keep (30 days retention)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="data/backups/backup.log"

# Ensure we're in the project root (where package.json is)
cd "$(dirname "$0")/.." || { echo "Error: Could not navigate to project root"; exit 1; }

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR" || { echo "Error: Could not create backup directory"; exit 1; }

# Log function
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting IKIGAI X-ONE backup process"

# Check if data file exists
if [ ! -f "$DATA_FILE" ]; then
  log "Warning: Data file $DATA_FILE does not exist. Nothing to backup."
  exit 0
fi

# Create backup with timestamp
BACKUP_FILE="$BACKUP_DIR/sessions_$TIMESTAMP.json"
cp "$DATA_FILE" "$BACKUP_FILE" || { log "Error: Backup failed"; exit 1; }

# Compress backup to save space
gzip -f "$BACKUP_FILE" || log "Warning: Compression failed, but backup was created"

log "Backup created successfully: ${BACKUP_FILE}.gz"

# Clean up old backups if we have more than MAX_BACKUPS
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/sessions_*.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  log "Cleaning up old backups (keeping newest $MAX_BACKUPS)"
  ls -1t "$BACKUP_DIR"/sessions_*.gz | tail -n +$((MAX_BACKUPS+1)) | xargs rm -f
  log "Cleanup complete"
fi

# Print summary
log "Backup process completed"
log "Total backups: $(ls -1 "$BACKUP_DIR"/sessions_*.gz 2>/dev/null | wc -l)"
log "Oldest backup: $(ls -1t "$BACKUP_DIR"/sessions_*.gz 2>/dev/null | tail -1)"
log "Newest backup: ${BACKUP_FILE}.gz"
log "----------------------------------------"

exit 0
