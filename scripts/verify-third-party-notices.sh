#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sources_file="$repo_root/docs/third-party/fairscan-sources.md"
model_file="$repo_root/docs/third-party/fairscan-model.md"
manifest_file="$repo_root/android/app/src/main/java/com/scanapp/fairscan/SOURCE-MANIFEST.md"
license_file="$repo_root/LICENSE"
notice_file="$repo_root/NOTICE"
readme_file="$repo_root/README.md"

required_sources=(
  "imageprocessing/src/main/java/org/fairscan/imageprocessing/DocumentDetection.kt"
  "imageprocessing/src/main/java/org/fairscan/imageprocessing/Perspective.kt"
  "imageprocessing/src/main/java/org/fairscan/imageprocessing/PostProcessing.kt"
  "imageprocessing/src/main/java/org/fairscan/imageprocessing/quad/ContourOrientation.kt"
  "imageprocessing/src/main/java/org/fairscan/imageprocessing/quad/MinAreaRect.kt"
  "imageprocessing/src/main/java/org/fairscan/imageprocessing/quad/QuadScore.kt"
  "app/src/main/java/org/fairscan/app/domain/ImageSegmentation.kt"
  "app/src/main/java/org/fairscan/app/ui/screens/camera/QuadStabilizer.kt"
)

failures=0

require_text() {
  local file="$1"
  local text="$2"
  local description="$3"
  if [[ ! -f "$file" ]] || ! grep -Fq "$text" "$file"; then
    printf 'FAIL: %s\n' "$description" >&2
    failures=$((failures + 1))
  fi
}

for source_path in "${required_sources[@]}"; do
  require_text "$sources_file" "$source_path" "missing FairScan source registration: $source_path"
done

require_text "$sources_file" "source blob SHA" "fairscan-sources.md is missing the source blob SHA column"
require_text "$sources_file" "target path" "fairscan-sources.md is missing the target path column"
require_text "$sources_file" "copy mode" "fairscan-sources.md is missing the copy mode column"
require_text "$sources_file" "local changes" "fairscan-sources.md is missing the local changes column"
require_text "$sources_file" "copyright" "fairscan-sources.md is missing the copyright column"
require_text "$sources_file" "license" "fairscan-sources.md is missing the license column"
require_text "$model_file" "fairscan-segmentation-model" "missing FairScan model provenance"
require_text "$manifest_file" "2297341" "missing Android FairScan source manifest"

while IFS= read -r kotlin_file; do
  require_text "$kotlin_file" "Copyright 2025-2026 The FairScan authors" "missing FairScan copyright header: ${kotlin_file#$repo_root/}"
  require_text "$kotlin_file" "Upstream:" "missing Upstream annotation: ${kotlin_file#$repo_root/}"
done < <(find "$repo_root/android/app/src/main/java/com/scanapp/fairscan" "$repo_root/android/app/src/reference/java/com/scanapp/fairscan" -type f -name '*.kt' 2>/dev/null | sort)

for file in "$license_file" "$notice_file" "$readme_file"; do
  require_text "$file" "FairScan" "missing FairScan attribution: ${file#$repo_root/}"
  require_text "$file" "GPL" "missing GPLv3 attribution: ${file#$repo_root/}"
done
require_text "$notice_file" "v2.2.0" "NOTICE is missing the FairScan v2.2.0 tag"
require_text "$notice_file" "2297341" "NOTICE is missing the FairScan 2297341 revision"
require_text "$license_file" "GNU GENERAL PUBLIC LICENSE" "LICENSE is missing the GPLv3 text"

# Every provenance row must be complete and use a full Git blob ID.
while IFS='|' read -r source_path blob_sha target_path copy_mode local_changes copyright license; do
  source_path="${source_path# }"; source_path="${source_path% }"
  [[ "$source_path" != *.kt ]] && continue
  if [[ -z "$blob_sha" || -z "$target_path" || -z "$copy_mode" || -z "$local_changes" || -z "$copyright" || -z "$license" || ! "$blob_sha" =~ ^[0-9a-fA-F]{40}$ ]]; then
    printf 'FAIL: incomplete FairScan provenance row: %s\n' "$source_path" >&2
    failures=$((failures + 1))
  fi
done < "$sources_file"

# The attribution marker must be immediately after the upstream GPL header.
while IFS= read -r kotlin_file; do
  if ! awk 'BEGIN { found=0; prev="" } /Copyright 2025-2026 The FairScan authors/ { found=1 } found && /^\/\/ Upstream:/ { if (prev !~ /^[[:space:]]*\*\/[[:space:]]*$/) exit 1; exit 0 } { prev=$0 } END { if (!found) exit 1 }' "$kotlin_file"; then
    printf 'FAIL: Upstream marker is not immediately after GPL header: %s\n' "${kotlin_file#$repo_root/}" >&2
    failures=$((failures + 1))
  fi
done < <(find "$repo_root/android/app/src/main/java/com/scanapp/fairscan" "$repo_root/android/app/src/reference/java/com/scanapp/fairscan" -type f -name '*.kt' 2>/dev/null | sort)

# The upstream segmentation reference is intentionally outside the Android main source set.
if [[ -f "$repo_root/android/app/src/main/java/com/scanapp/fairscan/segmentation/ImageSegmentation.kt" ]]; then
  printf 'FAIL: ImageSegmentation reference must not be in the default main source set\n' >&2
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  exit 1
fi

printf 'PASS: FairScan third-party notices are complete.\n'
