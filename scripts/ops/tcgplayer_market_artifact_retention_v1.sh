#!/usr/bin/env bash
set -euo pipefail

schema_version="TCGPLAYER_MARKET_ARTIFACT_RETENTION_V1"
artifact_root="${TCGPLAYER_MARKET_SCHEDULE_OUT_ROOT:-/var/lib/grookai/market-pricing}"
archive_root="${TCGPLAYER_MARKET_RETENTION_ARCHIVE_ROOT:-}"
target_free_bytes="${TCGPLAYER_MARKET_RETENTION_TARGET_FREE_BYTES:-25000000000}"
minimum_age_hours="${TCGPLAYER_MARKET_RETENTION_MINIMUM_AGE_HOURS:-336}"
maximum_archives="${TCGPLAYER_MARKET_RETENTION_MAX_ARCHIVES:-10}"
apply=0

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

for arg in "$@"; do
  case "$arg" in
    --apply) apply=1 ;;
    --artifact-root=*) artifact_root="${arg#*=}" ;;
    --archive-root=*) archive_root="${arg#*=}" ;;
    --target-free-bytes=*) target_free_bytes="${arg#*=}" ;;
    --minimum-age-hours=*) minimum_age_hours="${arg#*=}" ;;
    --maximum-archives=*) maximum_archives="${arg#*=}" ;;
    *) fail "unknown argument: $arg" ;;
  esac
done

archive_root="${archive_root:-${artifact_root}/.verified-archives}"

for value in "$target_free_bytes" "$minimum_age_hours" "$maximum_archives"; do
  [[ "$value" =~ ^[0-9]+$ ]] || fail "retention settings must be non-negative integers"
done
[[ "$maximum_archives" -ge 1 ]] || fail "maximum archives must be positive"
[[ -d "$artifact_root" ]] || fail "artifact root is missing: $artifact_root"
artifact_root="$(realpath -e -- "$artifact_root")"
mkdir -p -- "$archive_root"
archive_root="$(realpath -e -- "$archive_root")"
[[ "$archive_root" == "$artifact_root/"* ]] || fail "archive root must remain beneath artifact root"
if [[ "$apply" -eq 1 ]]; then
  [[ "$EUID" -eq 0 ]] || fail "apply mode must run as root"
  exec 9>/run/lock/grookai-tcgplayer-market-artifact-retention.lock
  flock -n 9 || fail "another market artifact retention run holds the lock"
fi

free_bytes() { df --output=avail -B1 -- "$artifact_root" | tail -1 | tr -d ' '; }
free_before="$(free_bytes)"
printf 'schema_version=%s\nmode=%s\nartifact_root=%s\narchive_root=%s\nfree_bytes_before=%s\ntarget_free_bytes=%s\n' \
  "$schema_version" "$([[ "$apply" -eq 1 ]] && printf apply || printf plan)" \
  "$artifact_root" "$archive_root" "$free_before" "$target_free_bytes"
if [[ "$free_before" -ge "$target_free_bytes" ]]; then
  printf 'archived_count=0\nfree_bytes_after=%s\nstatus=capacity_already_satisfied\n' "$free_before"
  exit 0
fi

minimum_age_minutes="$((minimum_age_hours * 60))"
mapfile -d '' candidates < <(
  find "$artifact_root" -mindepth 1 -maxdepth 1 -type d \
    -name 'TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-20*' \
    -mmin "+$minimum_age_minutes" -printf '%T@ %p\0' | sort -z -n
)

archived_count=0
planned_count=0
projected_free="$free_before"
for record in "${candidates[@]}"; do
  [[ "$planned_count" -lt "$maximum_archives" ]] || break
  source_path="${record#* }"
  source_real="$(realpath -e -- "$source_path")"
  [[ "$(dirname -- "$source_real")" == "$artifact_root" ]] || fail "candidate escaped artifact root"
  [[ ! -L "$source_path" ]] || fail "candidate may not be a symlink"
  source_name="$(basename -- "$source_real")"
  [[ "$source_name" =~ ^TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-20[0-9A-Za-z._-]+$ ]] || fail "candidate name is not governed"
  if [[ ! -f "$source_real/scheduled_summary.json" ]]; then
    printf 'skipped=%s reason=scheduled_summary_missing\n' "$source_real"
    continue
  fi
  if ! node --input-type=module - "$source_real/scheduled_summary.json" "$source_name" <<'NODE'
import fs from 'node:fs';
const summary = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (summary.run_key !== process.argv[3] || !['completed', 'failed'].includes(summary.status) ||
    summary.mode !== 'production') process.exit(1);
NODE
  then
    printf 'skipped=%s reason=scheduled_summary_not_final_production\n' "$source_real"
    continue
  fi
  source_bytes="$(du -sb -- "$source_real" | cut -f1)"
  planned_count="$((planned_count + 1))"
  projected_free="$((projected_free + source_bytes))"
  printf 'candidate=%s source_bytes=%s\n' "$source_real" "$source_bytes"
  [[ "$apply" -eq 1 ]] || { [[ "$projected_free" -lt "$target_free_bytes" ]] || break; continue; }

  archive="$archive_root/$source_name.tar.zst"
  manifest="$archive_root/$source_name.files.sha256"
  archive_hash="$archive.sha256"
  metadata="$archive_root/$source_name.archive.json"
  for target in "$archive" "$manifest" "$archive_hash" "$metadata"; do
    [[ ! -e "$target" ]] || fail "archive target already exists: $target"
  done
  partial_archive="$archive.partial"
  partial_manifest="$manifest.partial"
  partial_hash="$archive_hash.partial"
  partial_metadata="$metadata.partial"
  trap 'rm -f -- "$partial_archive" "$partial_manifest" "$partial_hash" "$partial_metadata"' EXIT
  (cd -- "$source_real" && find . -xdev -type f -print0 | LC_ALL=C sort -z | xargs -0 -r sha256sum) > "$partial_manifest"
  tar --zstd --create --file="$partial_archive" --directory="$artifact_root" "$source_name"
  zstd --test --quiet "$partial_archive"
  tar --zstd --compare --file="$partial_archive" --directory="$artifact_root" "$source_name"
  archive_sha256="$(sha256sum "$partial_archive" | cut -d' ' -f1)"
  manifest_sha256="$(sha256sum "$partial_manifest" | cut -d' ' -f1)"
  archive_bytes="$(stat -c '%s' "$partial_archive")"
  printf '%s  %s\n' "$archive_sha256" "$(basename -- "$archive")" > "$partial_hash"
  printf '{"schema_version":"%s","archived_at":"%s","source_path":"%s","source_run_key":"%s","source_bytes":%s,"source_manifest_sha256":"%s","archive_path":"%s","archive_bytes":%s,"archive_sha256":"%s","source_removal_status":"completed_verified"}\n' \
    "$schema_version" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$source_real" "$source_name" "$source_bytes" \
    "$manifest_sha256" "$archive" "$archive_bytes" "$archive_sha256" > "$partial_metadata"
  mv -- "$partial_archive" "$archive"
  mv -- "$partial_manifest" "$manifest"
  mv -- "$partial_hash" "$archive_hash"
  mv -- "$partial_metadata" "$metadata"
  (cd -- "$archive_root" && sha256sum --check --status "$(basename -- "$archive_hash")")
  [[ "$(realpath -e -- "$source_real")" == "$source_real" ]] || fail "candidate path changed before removal"
  [[ "$(dirname -- "$source_real")" == "$artifact_root" ]] || fail "candidate escaped before removal"
  rm -rf --one-file-system -- "$source_real"
  [[ ! -e "$source_real" ]] || fail "verified source remains after removal"
  trap - EXIT
  archived_count="$((archived_count + 1))"
  printf 'archived=%s archive_bytes=%s archive_sha256=%s\n' "$source_name" "$archive_bytes" "$archive_sha256"
  [[ "$(free_bytes)" -lt "$target_free_bytes" ]] || break
done

free_after="$(free_bytes)"
printf 'projected_free_bytes=%s\nplanned_count=%s\narchived_count=%s\nfree_bytes_after=%s\n' \
  "$projected_free" "$planned_count" "$archived_count" "$free_after"
if [[ "$apply" -eq 1 ]]; then
  [[ "$free_after" -ge "$target_free_bytes" ]] || fail "eligible archives did not restore the capacity target"
  printf 'status=capacity_restored\n'
else
  [[ "$projected_free" -ge "$target_free_bytes" ]] || fail "eligible archives cannot restore the capacity target"
  printf 'status=plan_sufficient\n'
fi
