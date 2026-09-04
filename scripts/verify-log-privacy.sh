#!/usr/bin/env bash
set -euo pipefail

module="android/app/src/main/java/com/scanapp/ScannerModule.kt"
[[ -f "$module" ]] || { echo "ScannerModule.kt missing" >&2; exit 1; }

log_payload="$(grep -F 'output.writeText' "$module")"
printf '%s\n' "$log_payload" | grep -Fq 'status=ok' || { echo "log export status missing" >&2; exit 1; }
for forbidden in 'title' 'fileName' 'absolutePath' 'imageBytes' 'pdfBytes' 'PDF内容' '图片内容'; do
  if printf '%s\n' "$log_payload" | grep -Fqi -- "$forbidden"; then
    echo "sensitive log field found: $forbidden" >&2
    exit 1
  fi
done
echo "log privacy verified"
