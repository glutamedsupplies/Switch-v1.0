#!/usr/bin/env bash
# Fail CI if scratch trees or dependency folders are committed again.
set -euo pipefail

echo "Checking checkout for forbidden tracked paths..."

forbidden="$(git ls-files | grep -E '(^|/)\.tmp/|(^|/)node_modules/' || true)"
if [[ -n "${forbidden}" ]]; then
  echo "::error::Forbidden paths are tracked in this checkout (.tmp/ or node_modules/)."
  echo "${forbidden}" | head -n 80
  count="$(printf '%s\n' "${forbidden}" | wc -l)"
  echo "(${count} matching paths; showing first 80)"
  exit 1
fi

dumps="$(git ls-files -- \
  flutter_01.png \
  tmp-live-chat-width-check.png \
  .tmp_orig_admin_nav.js \
  Insight \
  || true)"
if [[ -n "${dumps}" ]]; then
  echo "::error::Known scratch/UTF-16 dump files are tracked again:"
  echo "${dumps}"
  exit 1
fi

hw_build="$(git ls-files | grep -E '^hardware/.+/build/' || true)"
if [[ -n "${hw_build}" ]]; then
  echo "::error::Hardware firmware build artifacts are tracked:"
  echo "${hw_build}" | head -n 40
  exit 1
fi

if [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
  base_ref="${GITHUB_BASE_REF:-main}"
  echo "Checking PR added files against origin/${base_ref}..."
  git fetch --no-tags --depth=1 origin "${base_ref}"
  added="$(git diff --diff-filter=A --name-only "origin/${base_ref}...HEAD" \
    | grep -E '(^|/)\.tmp/|(^|/)node_modules/|^flutter_[0-9].*\.png$|^tmp-.*\.png$|^\.tmp_orig_|^(Insight)$' \
    || true)"
  if [[ -n "${added}" ]]; then
    echo "::error::PR adds forbidden junk paths:"
    echo "${added}"
    exit 1
  fi
fi

echo "Path guards passed."
