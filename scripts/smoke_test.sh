#!/usr/bin/env bash
set -euo pipefail

# Simple smoke test for Vendora deployment
# Usage: ./scripts/smoke_test.sh https://app.yourdomain.com

URL=${1:-http://127.0.0.1:8000}

echo "Running smoke tests against $URL"

# Health endpoints
echo -n "Checking /api/v1/healthz: "
if curl -fsS --max-time 5 "$URL/api/v1/healthz" >/dev/null; then
  echo "OK"
else
  echo "FAIL"
fi

echo -n "Checking /api/v1/health: "
if curl -fsS --max-time 5 "$URL/api/v1/health" >/dev/null; then
  echo "OK"
else
  echo "FAIL"
fi

# Basic homepage
echo -n "Checking / : "
if curl -fsS --max-time 5 "$URL/" >/dev/null; then
  echo "OK"
else
  echo "FAIL"
fi

# Optional: quick load test with hey if installed
if command -v hey >/dev/null 2>&1; then
  echo "Running short load test (10s, 50 concurrent)..."
  hey -z 10s -c 50 "$URL/api/v1/healthz" || true
else
  echo "hey not installed; skip load test (install: go install github.com/rakyll/hey@latest)"
fi
