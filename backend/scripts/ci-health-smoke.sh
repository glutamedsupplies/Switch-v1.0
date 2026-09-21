#!/usr/bin/env bash
# Start the backend briefly and confirm GET /health returns 200.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

PORT="${PORT:-18080}"
export PORT
export REQUIRE_SECRETS="${REQUIRE_SECRETS:-0}"
unset DATABASE_URL || true

log="$(mktemp)"
pid=""
lan_urls="${ROOT}/../lib/services/generated_local_api_lan_urls.dart"
lan_backup=""
if [[ -f "${lan_urls}" ]]; then
  lan_backup="$(mktemp)"
  cp "${lan_urls}" "${lan_backup}"
fi
cleanup() {
  if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
    kill "${pid}" 2>/dev/null || true
    wait "${pid}" 2>/dev/null || true
  fi
  if [[ -n "${lan_backup}" ]]; then
    mv "${lan_backup}" "${lan_urls}"
  fi
  rm -f "${log}"
}
trap cleanup EXIT

node server.js >"${log}" 2>&1 &
pid=$!

for _ in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/tmp/switch-health.json 2>/dev/null; then
    echo "Health smoke passed:"
    cat /tmp/switch-health.json
    echo
    exit 0
  fi
  if ! kill -0 "${pid}" 2>/dev/null; then
    echo "Backend exited before becoming healthy:"
    cat "${log}"
    exit 1
  fi
  sleep 1
done

echo "Timed out waiting for /health. Server log:"
cat "${log}"
exit 1
