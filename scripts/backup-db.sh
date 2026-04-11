#!/bin/bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
FILENAME="nexusai_${TIMESTAMP}.sql.gz"
S3_BUCKET="${S3_BUCKET:-nexusai-backups}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."
pg_dump "$DATABASE_URL" | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "[$(date)] Uploading to S3..."
aws s3 cp "${BACKUP_DIR}/${FILENAME}" "s3://${S3_BUCKET}/backups/${FILENAME}" \
  --sse AES256 \
  --storage-class STANDARD_IA

echo "[$(date)] Cleaning local backups older than 2 days..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +2 -delete

echo "[$(date)] Cleaning S3 backups older than 30 days..."
aws s3 ls "s3://${S3_BUCKET}/backups/" | awk '{print $4}' | while read -r key; do
  DATE=$(echo "$key" | grep -oP '\d{8}')
  if [[ $(date -d "$DATE" +%s 2>/dev/null || echo 0) -lt $(date -d '30 days ago' +%s) ]]; then
    aws s3 rm "s3://${S3_BUCKET}/backups/$key"
  fi
done

echo "[$(date)] Backup complete: $FILENAME"
