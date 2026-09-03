#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
guard="$repo_root/scripts/verify-release-contents.sh"
fixture_dir="$(mktemp -d)"
trap 'rm -rf "$fixture_dir"' EXIT

mkdir -p "$fixture_dir/clean/assets"
printf 'com.scanapp release\n' > "$fixture_dir/clean/classes.dex"
cp "$repo_root/LICENSE" "$fixture_dir/clean/assets/LICENSE"
cp "$repo_root/NOTICE" "$fixture_dir/clean/assets/NOTICE"
(cd "$fixture_dir/clean" && zip -q -r "$fixture_dir/clean.apk" classes.dex assets)

if ! "$guard" "$fixture_dir/clean.apk"; then
  echo "clean fixture should pass" >&2
  exit 1
fi

mkdir -p "$fixture_dir/missing-legal"
printf 'com.scanapp release\n' > "$fixture_dir/missing-legal/classes.dex"
(cd "$fixture_dir/missing-legal" && zip -q "$fixture_dir/missing-legal.apk" classes.dex)

if "$guard" "$fixture_dir/missing-legal.apk"; then
  echo "fixture without packaged legal notices should fail" >&2
  exit 1
fi

mkdir -p "$fixture_dir/bad/src/androidTest/assets"
printf 'de.schliweb.makeacopy /Users/example/project\n' > "$fixture_dir/bad/classes.dex"
printf 'test pdf' > "$fixture_dir/bad/src/androidTest/assets/sample.pdf"
(cd "$fixture_dir/bad" && zip -q -r "$fixture_dir/bad.apk" classes.dex src)

if "$guard" "$fixture_dir/bad.apk"; then
  echo "bad fixture should fail" >&2
  exit 1
fi

echo "verify-release-contents tests passed"
