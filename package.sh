#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
cd "$root"

version="$(python3 -c "import json; print(json.load(open('extension/manifest.json'))['version'])")"
mkdir -p web-ext-artifacts

chrome_zip="web-ext-artifacts/fourtytwolities-${version}-chromium.zip"
rm -f "$chrome_zip"

echo "Packaging Chromium ${version}…"
(
  cd extension
  zip -r -X "../${chrome_zip}" . -x "*.DS_Store"
) &
chrome_pid=$!

echo "Packaging Firefox ${version}…"
npx --yes web-ext build &
firefox_pid=$!

status=0
wait "$chrome_pid" || status=$?
wait "$firefox_pid" || status=$?

if [[ "$status" -ne 0 ]]; then
  echo "Packaging failed." >&2
  exit "$status"
fi

echo
echo "Chromium: ${chrome_zip}"
echo "Firefox:  web-ext-artifacts/fourtytwolities-${version}.zip"
