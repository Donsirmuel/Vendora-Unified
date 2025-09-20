#!/usr/bin/env bash
set -euo pipefail

# Simple backup and local restore test.
# This script requires: pg_dump, pg_restore, and docker (optional but recommended).
# It will create a dump and attempt to restore into a temporary Docker Postgres container to validate the backup.

OUT_DIR="/tmp"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FNAME="vendora-db-test-${TIMESTAMP}.dump"

if [ -f backend/.env ]; then
  # shellcheck disable=SC1091
  source backend/.env
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Please set it in backend/.env or env and retry." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found; install postgresql-client" >&2
  exit 1
fi

echo "Creating dump: ${OUT_DIR}/${FNAME}"
pg_dump --no-owner --format=custom "$DATABASE_URL" -f "${OUT_DIR}/${FNAME}"

echo "Dump created. Attempting local restore using Docker Postgres..."
if command -v docker >/dev/null 2>&1; then
  CONTAINER_NAME="vendora-test-$(date +%s)"
  docker run -d --name "$CONTAINER_NAME" -e POSTGRES_PASSWORD=test -e POSTGRES_USER=test -e POSTGRES_DB=test -p 5433:5432 postgres:15
  echo "Waiting for Postgres container to accept connections..."
  sleep 6
  echo "Restoring into container..."
  docker cp "${OUT_DIR}/${FNAME}" "$CONTAINER_NAME":/tmp/${FNAME}
  docker exec -u postgres "$CONTAINER_NAME" pg_restore --clean --no-owner -d test /tmp/${FNAME}
  echo "Restore finished. Inspect container logs or connect on port 5433 to verify."
  echo "Cleaning up container..."
  docker stop "$CONTAINER_NAME" >/dev/null
  docker rm "$CONTAINER_NAME" >/dev/null
  echo "Local restore test completed successfully."
else
  echo "Docker not available; to test restore, create a test Postgres and run:"
  echo "pg_restore --clean --no-owner -d <testdb> ${OUT_DIR}/${FNAME}" 
  exit 0
fi
