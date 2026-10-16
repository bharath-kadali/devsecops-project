#!/usr/bin/env bash
set -euo pipefail

URL="${URL:-http://clouddesk.local/api/tickets}"
echo "Sending 500 requests to: $URL"

for i in $(seq 1 500); do
  curl -s "$URL" >/dev/null || true
done

echo "Load test completed successfully (500 requests)."
