#!/usr/bin/env bash
# Creates a timestamped logical backup (pg_dump custom format) of the configured Postgres database.
# Requires: pg_dump in PATH and $DATABASE_URL set (postgres://user:pass@host:port/dbname)
# Optional: RETENTION (number of most recent backups to keep, default 7)
set -euo pipefail

RETENTION="${RETENTION:-7}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup] ERROR: DATABASE_URL not set" >&2
  exit 1
fi

command -v pg_dump >/dev/null 2>&1 || { echo "[backup] ERROR: pg_dump not found in PATH" >&2; exit 1; }

parse_url() {
  # parse postgres://user:pass@host:port/db?options
  local url="$1"
  local proto rest auth hostport db query user pass host port
  proto="${url%%://*}"
  rest="${url#*://}"
  auth="${rest%%@*}"
  rest="${rest#*@}"
  hostport="${rest%%/*}"
  rest="${rest#*/}"
  db="${rest%%\?*}"
  query="${rest#*\?}"; [[ "$query" == "$rest" ]] && query=""
  user="${auth%%:*}"; pass="${auth#*:}"; [[ "$pass" == "$auth" ]] && pass=""
  host="${hostport%%:*}"; port="${hostport#*:}"; [[ "$port" == "$hostport" ]] && port="5432"
  echo "$user" "$pass" "$host" "$port" "$db" "$query"
}

read USER PASS HOST PORT DB QUERY < <(parse_url "$DATABASE_URL")
if [[ -z "$DB" ]]; then
  echo "[backup] ERROR: could not parse database name from DATABASE_URL" >&2
  exit 1
fi

BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$BACKUP_DIR/db_${TS}.dump"

export PGPASSWORD="$PASS"

echo "[backup] Starting pg_dump -> $OUT_FILE" >&2
START=$(date +%s)
if ! pg_dump -h "$HOST" -p "$PORT" -U "$USER" -F c --no-owner --no-privileges "$DB" -f "$OUT_FILE"; then
  echo "[backup] ERROR: pg_dump failed" >&2
  exit 1
fi
END=$(date +%s)
DUR=$((END-START))
echo "[backup] Completed in ${DUR}s" >&2

# Retention
if [[ "$RETENTION" =~ ^[0-9]+$ ]] && [[ "$RETENTION" -gt 0 ]]; then
  mapfile -t FILES < <(ls -1t "$BACKUP_DIR"/db_*.dump 2>/dev/null || true)
  COUNT=${#FILES[@]}
  if [[ "$COUNT" -gt "$RETENTION" ]]; then
    for ((i=RETENTION; i<COUNT; i++)); do
      echo "[backup] Removing old backup: ${FILES[$i]}" >&2
      rm -f "${FILES[$i]}"
    done
  fi
fi

echo "[backup] Done." >&2
