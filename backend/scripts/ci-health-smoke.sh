#!/usr/bin/env bash
# Start the backend briefly and confirm GET /health returns 200 on loopback only.
# Also asserts Step 3 live gates that the Node suite covers in more depth:
# CORS never *, missing session → 401, unauth upload/webhook/confirm-payment reject.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

PORT="${PORT:-18080}"
export PORT
export BIND_HOST="${BIND_HOST:-127.0.0.1}"
export REQUIRE_SECRETS="${REQUIRE_SECRETS:-0}"
unset DATABASE_URL || true

log="$(mktemp)"
header_file="$(mktemp)"
body_file="$(mktemp)"
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
  rm -f "${log}" "${header_file}" "${body_file}"
}
trap cleanup EXIT

header_value() {
  local name="$1"
  python3 - "${header_file}" "${name}" <<'PY'
import sys
path, name = sys.argv[1], sys.argv[2].lower()
value = ""
with open(path, "r", encoding="utf-8", errors="replace") as handle:
    for raw in handle:
        line = raw.rstrip("\r\n")
        if ":" not in line:
            continue
        key, rest = line.split(":", 1)
        if key.strip().lower() == name:
            value = rest.strip()
print(value)
PY
}

http_status() {
  python3 - "${header_file}" <<'PY'
import sys
path = sys.argv[1]
with open(path, "r", encoding="utf-8", errors="replace") as handle:
    first = handle.readline().rstrip("\r\n")
parts = first.split()
print(parts[1] if len(parts) >= 2 else "")
PY
}

assert_no_acao_star() {
  local ctx="$1"
  local acao
  acao="$(header_value "access-control-allow-origin")"
  if [[ "${acao}" == "*" ]]; then
    echo "ERROR: ${ctx}: Access-Control-Allow-Origin is *"
    cat "${header_file}"
    exit 1
  fi
}

request() {
  local method="$1"
  local url_path="$2"
  shift 2
  curl -sS -D "${header_file}" -o "${body_file}" \
    --connect-timeout 3 --max-time 8 \
    -X "${method}" \
    "$@" \
    "http://127.0.0.1:${PORT}${url_path}"
}

node server.js >"${log}" 2>&1 &
pid=$!

healthy=0
for _ in $(seq 1 45); do
  if curl -fsS --connect-timeout 1 --max-time 3 \
    "http://127.0.0.1:${PORT}/health" >"${body_file}" 2>/dev/null; then
    healthy=1
    break
  fi
  if ! kill -0 "${pid}" 2>/dev/null; then
    echo "Backend exited before becoming healthy:"
    cat "${log}"
    exit 1
  fi
  sleep 1
done

if [[ "${healthy}" -ne 1 ]]; then
  echo "Timed out waiting for /health. Server log:"
  cat "${log}"
  exit 1
fi

if ! grep -q "listening on ${BIND_HOST}:${PORT}" "${log}"; then
  echo "ERROR: server log does not show loopback bind (${BIND_HOST}:${PORT}):"
  cat "${log}"
  exit 1
fi
if grep -E "listening on (0\.0\.0\.0|::):${PORT}" "${log}"; then
  echo "ERROR: server bound a wildcard address"
  cat "${log}"
  exit 1
fi

if command -v ss >/dev/null 2>&1; then
  listen_addrs="$(ss -ltn | awk '{print $4}')"
  if printf '%s\n' "${listen_addrs}" | grep -Eq "(^|[^0-9])0\\.0\\.0\\.0:${PORT}$|\\*:${PORT}$|\\[::\\]:${PORT}$"; then
    echo "ERROR: port ${PORT} is listening on a wildcard address:"
    ss -ltn | grep -E ":${PORT}\\b" || true
    exit 1
  fi
  if ! printf '%s\n' "${listen_addrs}" | grep -Eq "(^|[^0-9])127\\.0\\.0\\.1:${PORT}$|\\[::1\\]:${PORT}$"; then
    echo "ERROR: port ${PORT} is not bound on loopback:"
    ss -ltn | grep -E ":${PORT}\\b" || true
    exit 1
  fi
fi
echo "Bind: listening on ${BIND_HOST}:${PORT} (loopback, not wildcard)."

non_loopback="$(ip -4 -o addr show scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1 | head -n1 || true)"
if [[ -n "${non_loopback}" ]]; then
  if curl -fsS --connect-timeout 2 --max-time 3 \
    "http://${non_loopback}:${PORT}/health"; then
    echo "ERROR: /health is reachable on non-loopback ${non_loopback} (BIND_HOST is not localhost-only)"
    exit 1
  fi
  echo "/health is not reachable on ${non_loopback} (localhost-only bind)."
fi

request GET "/health" -H "Origin: http://evil.example"
status="$(http_status)"
if [[ "${status}" != "200" ]]; then
  echo "ERROR: GET /health expected 200, got ${status}"
  cat "${header_file}" "${body_file}"
  exit 1
fi
assert_no_acao_star "GET /health with evil Origin"
if grep -q '"status":"ok"' "${body_file}"; then
  echo "Health smoke passed:"
  cat "${body_file}"
  echo
else
  echo "ERROR: /health body missing status=ok"
  cat "${body_file}"
  exit 1
fi

request OPTIONS "/api/orders" \
  -H "Origin: http://evil.example" \
  -H "Access-Control-Request-Method: GET"
status="$(http_status)"
assert_no_acao_star "OPTIONS /api/orders evil Origin"
if [[ "${status}" != "403" ]]; then
  echo "ERROR: evil Origin OPTIONS expected 403, got ${status}"
  cat "${header_file}" "${body_file}"
  exit 1
fi
echo "CORS: evil Origin denied (${status}), no Access-Control-Allow-Origin *."

request OPTIONS "/api/orders" \
  -H "Origin: http://localhost:7357" \
  -H "Access-Control-Request-Method: GET"
status="$(http_status)"
acao="$(header_value "access-control-allow-origin")"
if [[ "${status}" != "204" ]]; then
  echo "ERROR: localhost Origin OPTIONS expected 204, got ${status}"
  cat "${header_file}" "${body_file}"
  exit 1
fi
if [[ "${acao}" != "http://localhost:7357" ]]; then
  echo "ERROR: localhost Origin expected ACAO http://localhost:7357, got '${acao}'"
  cat "${header_file}"
  exit 1
fi
echo "CORS: localhost Origin allowed (${acao})."

request GET "/api/orders"
status="$(http_status)"
if [[ "${status}" != "401" ]]; then
  echo "ERROR: missing session GET /api/orders expected 401, got ${status}"
  cat "${header_file}" "${body_file}"
  exit 1
fi

request GET "/api/orders" -H "X-Switch-Session: forged-token"
status="$(http_status)"
if [[ "${status}" != "401" ]]; then
  echo "ERROR: forged session GET /api/orders expected 401, got ${status}"
  cat "${header_file}" "${body_file}"
  exit 1
fi
echo "Session: missing/forged token returned 401."

request POST "/api/uploads" \
  -H "Content-Type: text/plain" \
  -H "X-File-Name: nope.txt" \
  --data "not-a-valid-upload"
status="$(http_status)"
if [[ "${status}" != "401" ]]; then
  echo "ERROR: unauth POST /api/uploads expected 401, got ${status}"
  cat "${header_file}" "${body_file}"
  exit 1
fi
echo "Upload: unauthenticated POST returned 401."

request POST "/api/payments/paymongo/seller-webhook" \
  -H "Content-Type: application/json" \
  --data "{}"
status="$(http_status)"
if [[ "${status}" != "401" && "${status}" != "503" ]]; then
  echo "ERROR: unsigned PayMongo webhook expected 401 or 503, got ${status}"
  cat "${header_file}" "${body_file}"
  exit 1
fi
echo "PayMongo webhook: unsigned request rejected (${status})."

request POST "/api/account/become-seller/confirm-payment" \
  -H "Content-Type: application/json" \
  --data '{"accountId":"acct-1","companyId":"co-1","paymentGateway":"paymongo","paymentReference":"steal-activation"}'
status="$(http_status)"
if [[ "${status}" != "401" && "${status}" != "403" ]]; then
  echo "ERROR: unauth confirm-payment expected 401 or 403, got ${status}"
  cat "${header_file}" "${body_file}"
  exit 1
fi
echo "confirm-payment: unauthenticated request rejected (${status})."

echo "Step 3 health/CORS/session/upload/PayMongo live gates passed."
exit 0
