#!/usr/bin/env bash
set -e
THRESHOLD=80
LINES=$(node - <<'JS'
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('coverage/coverage-summary.json'));
console.log(data.total.lines.pct);
JS
)
echo "Line coverage = $LINES%"
if (( $(echo "$LINES < $THRESHOLD" | bc -l) )); then
  echo "❌ Coverage below ${THRESHOLD}%"
  exit 1
fi
echo "✅ Coverage sufficient"
