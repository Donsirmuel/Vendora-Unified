#!/usr/bin/env bash
# Safe helper to find and optionally merge/remove env backups
# Usage: ./scripts/cleanup_envs.sh [--list] [--merge target] [--delete pattern]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
find_envs() {
  find "$ROOT_DIR" -maxdepth 3 -type f -name ".env*" ! -name ".env.example" -print
}

case "${1:---list}" in
  --list)
    find_envs || true
    ;;
  --merge)
    target=${2:-$ROOT_DIR/backend/.env}
    echo "Merging detected env files into: $target"
    mapfile -t files < <(find_envs)
    for f in "${files[@]}"; do
      echo "# from: $f" >> "$target"
      cat "$f" >> "$target"
      echo >> "$target"
    done
    echo "Merged ${#files[@]} files into $target"
    ;;
  --delete)
    pattern=${2:-'.env.bak*'}
    echo "This will delete files matching: $pattern"
    read -p "Are you sure? (yes/NO) " confirm
    if [ "$confirm" = "yes" ]; then
      find "$ROOT_DIR" -type f -name "$pattern" -print -delete
    else
      echo "Aborted."; exit 1
    fi
    ;;
  *)
    echo "Usage: $0 [--list] [--merge target] [--delete pattern]"; exit 1
    ;;
esac
