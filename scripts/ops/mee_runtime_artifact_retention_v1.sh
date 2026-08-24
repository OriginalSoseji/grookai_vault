#!/usr/bin/env bash
set -euo pipefail

audit_root="${MEE_RUNTIME_ARTIFACT_ROOT:-/var/lib/grookai/mee/audits}"
archive_root="${MEE_RUNTIME_ARCHIVE_ROOT:-/var/lib/grookai/mee/archive/runtime}"
target_free_bytes="${MEE_RETENTION_TARGET_FREE_BYTES:-21474836480}"
minimum_age_hours="${MEE_RETENTION_MINIMUM_AGE_HOURS:-168}"
maximum_archives="${MEE_RETENTION_MAX_ARCHIVES:-20}"
staging_margin_bytes="${MEE_RETENTION_STAGING_MARGIN_BYTES:-536870912}"
apply=0

for arg in "$@"; do
  case "$arg" in
    --apply) apply=1 ;;
    --target-free-bytes=*) target_free_bytes="${arg#*=}" ;;
    --minimum-age-hours=*) minimum_age_hours="${arg#*=}" ;;
    --maximum-archives=*) maximum_archives="${arg#*=}" ;;
    *) printf 'ERROR: unknown argument: %s\n' "$arg" >&2; exit 1 ;;
  esac
done

for value in "$target_free_bytes" "$minimum_age_hours" "$maximum_archives" "$staging_margin_bytes"; do
  [[ "$value" =~ ^[0-9]+$ ]] || { printf 'ERROR: retention settings must be integers\n' >&2; exit 1; }
done
[[ -d "$audit_root" ]] || { printf 'ERROR: audit root is missing: %s\n' "$audit_root" >&2; exit 1; }

audit_real="$(realpath -e -- "$audit_root")"
mkdir -p -- "$archive_root"
archive_real="$(realpath -e -- "$archive_root")"
minimum_age_minutes="$((minimum_age_hours * 60))"
free_bytes_before="$(df --output=avail -B1 -- "$audit_real" | tail -1 | tr -d ' ')"

printf 'schema_version=MEE_RUNTIME_ARTIFACT_RETENTION_V1\n'
printf 'mode=%s\n' "$([[ "$apply" -eq 1 ]] && printf apply || printf plan)"
printf 'audit_root=%s\narchive_root=%s\nfree_bytes_before=%s\ntarget_free_bytes=%s\n' \
  "$audit_real" "$archive_real" "$free_bytes_before" "$target_free_bytes"

if [[ "$free_bytes_before" -ge "$target_free_bytes" ]]; then
  printf 'archived_count=0\nstatus=capacity_already_satisfied\n'
  exit 0
fi

mapfile -d '' candidates < <(
  find "$audit_real" -mindepth 1 -maxdepth 1 -type d \
    \( -name 'mee_11l_market_listing_acquisition_daily_batch_fetch_*' \
       -o -name 'mee_11m_market_listing_acquisition_daily_batch_backfill_plan_*' \) \
    -mmin "+$minimum_age_minutes" -printf '%T@ %p\0' \
    | sort -z -n
)

archived_count=0
for candidate_record in "${candidates[@]}"; do
  [[ "$archived_count" -lt "$maximum_archives" ]] || break
  source_path="${candidate_record#* }"
  source_real="$(realpath -e -- "$source_path")"
  [[ "$(dirname -- "$source_real")" == "$audit_real" ]] || { printf 'ERROR: candidate escaped audit root\n' >&2; exit 1; }
  [[ ! -L "$source_path" ]] || { printf 'ERROR: candidate may not be a symlink\n' >&2; exit 1; }
  source_name="$(basename -- "$source_real")"
  source_bytes="$(du -sb -- "$source_real" | cut -f1)"
  printf 'candidate=%s source_bytes=%s\n' "$source_name" "$source_bytes"
  [[ "$apply" -eq 1 ]] || continue

  free_bytes="$(df --output=avail -B1 -- "$audit_real" | tail -1 | tr -d ' ')"
  required_bytes="$((source_bytes + staging_margin_bytes))"
  [[ "$free_bytes" -ge "$required_bytes" ]] || {
    printf 'ERROR: insufficient staging capacity for %s: free=%s required=%s\n' "$source_name" "$free_bytes" "$required_bytes" >&2
    exit 1
  }

  archive_path="$archive_real/$source_name.tar.zst"
  manifest_path="$archive_real/$source_name.files.sha256"
  archive_hash_path="$archive_real/$source_name.tar.zst.sha256"
  metadata_path="$archive_real/$source_name.archive.json"
  existing_targets=0
  for target in "$archive_path" "$manifest_path" "$archive_hash_path" "$metadata_path"; do
    [[ ! -e "$target" ]] || existing_targets="$((existing_targets + 1))"
  done
  if [[ "$existing_targets" -gt 0 ]]; then
    [[ "$existing_targets" -eq 4 ]] || { printf 'ERROR: incomplete archive target set for %s\n' "$source_name" >&2; exit 1; }
    grep -q '"source_removal_status": "authorized_pending"' "$metadata_path" || {
      printf 'ERROR: existing archive is not in resumable pending state: %s\n' "$metadata_path" >&2
      exit 1
    }
    (cd -- "$archive_real" && sha256sum --check --status "$(basename -- "$archive_hash_path")")
    zstd --test --quiet "$archive_path"
    rm -rf --one-file-system -- "$source_real"
    [[ ! -e "$source_real" ]] || { printf 'ERROR: pending source remains after resumed removal\n' >&2; exit 1; }
    metadata_update="$metadata_path.update"
    sed 's/"source_removal_status": "authorized_pending"/"source_removal_status": "completed_verified"/' \
      "$metadata_path" > "$metadata_update"
    mv -- "$metadata_update" "$metadata_path"
    archived_count="$((archived_count + 1))"
    free_bytes="$(df --output=avail -B1 -- "$audit_real" | tail -1 | tr -d ' ')"
    printf 'resumed_archive=%s free_bytes=%s\n' "$source_name" "$free_bytes"
    [[ "$free_bytes" -lt "$target_free_bytes" ]] || break
    continue
  fi

  partial_archive="$archive_path.partial"
  partial_manifest="$manifest_path.partial"
  partial_hash="$archive_hash_path.partial"
  partial_metadata="$metadata_path.partial"
  trap 'rm -f -- "$partial_archive" "$partial_manifest" "$partial_hash" "$partial_metadata"' EXIT

  (
    cd -- "$source_real"
    find . -xdev -type f -print0 | LC_ALL=C sort -z | xargs -0 -r sha256sum
  ) > "$partial_manifest"
  manifest_sha256="$(sha256sum "$partial_manifest" | cut -d' ' -f1)"
  tar --zstd --create --file="$partial_archive" --directory="$audit_real" "$source_name"
  zstd --test --quiet "$partial_archive"
  tar --zstd --compare --file="$partial_archive" --directory="$audit_real" "$source_name"
  archive_sha256="$(sha256sum "$partial_archive" | cut -d' ' -f1)"
  archive_bytes="$(stat -c '%s' "$partial_archive")"
  printf '%s  %s\n' "$archive_sha256" "$(basename -- "$archive_path")" > "$partial_hash"
  cat > "$partial_metadata" <<EOF
{
  "schema_version": "MEE_RUNTIME_ARTIFACT_ARCHIVE_V1",
  "archived_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source_path": "$source_real",
  "source_bytes": $source_bytes,
  "source_manifest_sha256": "$manifest_sha256",
  "archive_path": "$archive_path",
  "archive_bytes": $archive_bytes,
  "archive_sha256": "$archive_sha256",
  "source_removal_status": "authorized_pending"
}
EOF
  mv -- "$partial_archive" "$archive_path"
  mv -- "$partial_manifest" "$manifest_path"
  mv -- "$partial_hash" "$archive_hash_path"
  mv -- "$partial_metadata" "$metadata_path"
  (cd -- "$archive_real" && sha256sum --check --status "$(basename -- "$archive_hash_path")")
  [[ "$(dirname -- "$(realpath -e -- "$source_real")")" == "$audit_real" ]] || exit 1
  rm -rf --one-file-system -- "$source_real"
  [[ ! -e "$source_real" ]] || { printf 'ERROR: source remains after verified archive\n' >&2; exit 1; }
  metadata_update="$metadata_path.update"
  sed 's/"source_removal_status": "authorized_pending"/"source_removal_status": "completed_verified"/' \
    "$metadata_path" > "$metadata_update"
  mv -- "$metadata_update" "$metadata_path"
  trap - EXIT
  archived_count="$((archived_count + 1))"
  free_bytes="$(df --output=avail -B1 -- "$audit_real" | tail -1 | tr -d ' ')"
  printf 'archived=%s archive_sha256=%s free_bytes=%s\n' "$source_name" "$archive_sha256" "$free_bytes"
  [[ "$free_bytes" -lt "$target_free_bytes" ]] || break
done

free_bytes_after="$(df --output=avail -B1 -- "$audit_real" | tail -1 | tr -d ' ')"
printf 'archived_count=%s\nfree_bytes_after=%s\n' "$archived_count" "$free_bytes_after"
if [[ "$apply" -eq 1 && "$free_bytes_after" -lt "$target_free_bytes" ]]; then
  printf 'status=target_not_reached\n' >&2
  exit 1
fi
printf 'status=%s\n' "$([[ "$apply" -eq 1 ]] && printf capacity_restored || printf plan_complete)"
