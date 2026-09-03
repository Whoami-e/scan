#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 path/to/release.apk|aab" >&2
  exit 2
fi

artifact="$1"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
notice="$repo_root/NOTICE"

[[ -f "$artifact" ]] || { echo "release artifact not found: $artifact" >&2; exit 2; }
[[ -f "$notice" ]] || { echo "NOTICE is missing" >&2; exit 1; }

entries="$(unzip -Z1 "$artifact")"
for legal_file in 'assets/LICENSE' 'assets/NOTICE'; do
  if ! printf '%s\n' "$entries" | grep -Fxq -- "$legal_file"; then
    echo "missing packaged legal notice: $legal_file" >&2
    exit 1
  fi
done

unzip -p "$artifact" assets/NOTICE | grep -Fq 'OpenCV 4.12.0' || { echo 'packaged NOTICE must identify OpenCV 4.12.0' >&2; exit 1; }
unzip -p "$artifact" assets/NOTICE | grep -Fq 'Apache License 2.0' || { echo 'packaged NOTICE must identify Apache License 2.0' >&2; exit 1; }

for forbidden in 'de.schliweb.makeacopy' 'src/androidTest/assets' 'androidTest/assets' 'test-assets' 'test_data' 'ocr' 'onnx'; do
  if printf '%s\n' "$entries" | grep -Fqi -- "$forbidden"; then
    echo "forbidden release entry: $forbidden" >&2
    exit 1
  fi
done

while IFS= read -r entry; do
  [[ "$entry" == */ ]] && continue
  # Native dependency binaries can retain compiler source paths in symbol/debug
  # metadata; inspect app-readable payloads where release data can be exposed.
  case "$entry" in
    *.so|*.arsc|*.png|*.jpg|*.jpeg|*.webp|*.gif|*.mp4|*.wav) continue ;;
  esac
  content="$(unzip -p "$artifact" "$entry" 2>/dev/null | strings || true)"
  for forbidden in 'de.schliweb.makeacopy' '/Users/' '/home/' 'C:\\Users\\' 'FEATURE_FRAMING_LOGGING'; do
    if printf '%s\n' "$content" | grep -Fqi -- "$forbidden"; then
      echo "forbidden release content in $entry: $forbidden" >&2
      exit 1
    fi
  done
done <<< "$entries"

grep -Fq 'OpenCV 4.12.0' "$notice" || { echo 'NOTICE must identify OpenCV 4.12.0' >&2; exit 1; }
grep -Fq 'Apache License 2.0' "$notice" || { echo 'NOTICE must identify Apache License 2.0' >&2; exit 1; }

echo "release contents verified: $artifact"
