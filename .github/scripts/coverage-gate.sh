#!/usr/bin/env bash
set -euo pipefail
pct=$(grep -o '"statements"[^}]*' coverage/coverage-summary.json | head -n 1 | grep -o '"pct":[0-9.]*' | grep -o '[0-9.]*')
echo "Statements coverage: $pct"
if [ "$(printf '%.*f' 0 "$pct")" -lt 80 ]; then
  echo "Coverage below 80%"
  exit 1
fi
