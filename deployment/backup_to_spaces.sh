#!/usr/bin/env bash
set -euo pipefail

# Backup Postgres and upload to S3/Spaces-compatible endpoint.
# Requires: pg_dump, aws CLI or s3cmd configured with appropriate credentials.

OUT_DIR="/tmp"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FNAME="vendora-db-${TIMESTAMP}.dump"

# Read DATABASE_URL from backend/.env or environment
if [ -f backend/.env ]; then
  # shellcheck disable=SC1091
  source backend/.env
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Please export it or set it in backend/.env" >&2
  exit 1
fi

if [ -z "${S3_BUCKET:-}" ]; then
  echo "S3_BUCKET is not set. Set S3_BUCKET to the destination (e.g. s3://my-bucket)" >&2
  exit 1
fi

echo "Dumping database to ${OUT_DIR}/${FNAME}"
pg_dump --no-owner --format=custom "$DATABASE_URL" -f "${OUT_DIR}/${FNAME}"

echo "Uploading to ${S3_BUCKET}/${FNAME}"
if command -v aws >/dev/null 2>&1; then
  aws s3 cp "${OUT_DIR}/${FNAME}" "${S3_BUCKET}/${FNAME}"
elif command -v s3cmd >/dev/null 2>&1; then
  s3cmd put "${OUT_DIR}/${FNAME}" "${S3_BUCKET}/${FNAME}"
else
  echo "Error: neither aws nor s3cmd found. Install one to upload backups." >&2
  exit 1
fi

echo "Backup complete: ${S3_BUCKET}/${FNAME}"
