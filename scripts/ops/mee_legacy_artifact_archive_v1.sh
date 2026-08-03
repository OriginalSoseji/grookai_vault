#!/usr/bin/env bash
set -euo pipefail

LEGACY_ROOT_DEFAULT="/opt/grookai_vault_mee_nightly/docs/audits/market_evidence_engine_v1"
ARCHIVE_ROOT_DEFAULT="/var/lib/grookai/mee/archive/legacy_mutable_checkout"
MIN_SOURCE_AGE_MINUTES_DEFAULT=1440
STAGING_MARGIN_BYTES_DEFAULT=536870912

legacy_root="${MEE_LEGACY_AUDIT_ROOT:-$LEGACY_ROOT_DEFAULT}"
archive_root="${MEE_LEGACY_ARCHIVE_ROOT:-$ARCHIVE_ROOT_DEFAULT}"
min_source_age_minutes="${MEE_ARCHIVE_MIN_SOURCE_AGE_MINUTES:-$MIN_SOURCE_AGE_MINUTES_DEFAULT}"
staging_margin_bytes="${MEE_ARCHIVE_STAGING_MARGIN_BYTES:-$STAGING_MARGIN_BYTES_DEFAULT}"
source_path=""
apply=0

usage() {
  cat <<'EOF'
Usage:
  mee_legacy_artifact_archive_v1.sh --source=/absolute/direct-child/path [--archive-root=/absolute/path] [--apply]

The default is a read-only plan. --apply creates and verifies a compressed archive,
writes preservation metadata, and removes only the exact verified source directory.
EOF
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

for arg in "$@"; do
  case "$arg" in
    --source=*) source_path="${arg#*=}" ;;
    --archive-root=*) archive_root="${arg#*=}" ;;
    --apply) apply=1 ;;
    --help|-h) usage; exit 0 ;;
    *) fail "unknown argument: $arg" ;;
  esac
done

[[ -n "$source_path" ]] || fail "--source is required"
[[ "$source_path" = /* ]] || fail "source path must be absolute"
[[ "$legacy_root" = /* ]] || fail "legacy root must be absolute"
[[ "$archive_root" = /* ]] || fail "archive root must be absolute"
[[ "$min_source_age_minutes" =~ ^[0-9]+$ ]] || fail "minimum source age must be an integer"
[[ "$staging_margin_bytes" =~ ^[0-9]+$ ]] || fail "staging margin must be an integer"

legacy_real="$(realpath -e -- "$legacy_root")"
source_real="$(realpath -e -- "$source_path")"
[[ -d "$source_real" ]] || fail "source is not a directory"
[[ ! -L "$source_path" ]] || fail "source may not be a symlink"
[[ "$(dirname -- "$source_real")" == "$legacy_real" ]] || fail "source must be a direct child of the governed legacy root"

source_name="$(basename -- "$source_real")"
case "$source_name" in
  mee_11l_market_listing_acquisition_daily_batch_fetch_*) ;;
  mee_11m_market_listing_acquisition_daily_batch_backfill_plan_*) ;;
  *) fail "source name is outside the historical fetch/backfill allowlist: $source_name" ;;
esac

if [[ -n "$(find "$source_real" -xdev -type f -mmin "-$min_source_age_minutes" -print -quit)" ]]; then
  fail "source contains a file modified inside the minimum inactivity window"
fi

timer_enabled="$(systemctl is-enabled grookai-mee-nightly.timer 2>/dev/null || true)"
timer_active="$(systemctl is-active grookai-mee-nightly.timer 2>/dev/null || true)"
service_active="$(systemctl is-active grookai-mee-nightly.service 2>/dev/null || true)"
[[ "$timer_enabled" == "disabled" ]] || fail "MEE timer must be disabled, found: $timer_enabled"
[[ "$timer_active" == "inactive" ]] || fail "MEE timer must be inactive, found: $timer_active"
[[ "$service_active" == "inactive" ]] || fail "MEE service must be inactive, found: $service_active"
active_worker="$(pgrep -af 'node .*(market_listing_nightly_pipeline_v2|mee_nightly_droplet_worker|mee_nightly_post_ingest|market_listing_acquisition_daily_batch|market_listing_card_candidate)' || true)"
[[ -z "$active_worker" ]] || fail "a manual MEE worker is active: $active_worker"

current_release="$(readlink -f /opt/grookai_mee_current 2>/dev/null || true)"
case "$source_real" in
  "$current_release"/*) fail "source is inside the active immutable release" ;;
esac

source_bytes="$(du -sb -- "$source_real" | cut -f1)"
source_files="$(find "$source_real" -xdev -type f -printf '.' | wc -c)"
free_bytes="$(df --output=avail -B1 -- "$legacy_real" | tail -1 | tr -d ' ')"
required_staging_bytes="$((source_bytes + staging_margin_bytes))"
[[ "$free_bytes" -ge "$required_staging_bytes" ]] || fail "insufficient staging space: free=$free_bytes required=$required_staging_bytes"

archive_path="$archive_root/$source_name.tar.zst"
manifest_path="$archive_root/$source_name.files.sha256"
archive_hash_path="$archive_root/$source_name.tar.zst.sha256"
metadata_path="$archive_root/$source_name.archive.json"

printf 'mode=%s\n' "$([[ "$apply" -eq 1 ]] && printf apply || printf plan)"
printf 'source=%s\n' "$source_real"
printf 'source_bytes=%s\n' "$source_bytes"
printf 'source_files=%s\n' "$source_files"
printf 'archive=%s\n' "$archive_path"
printf 'free_bytes_before=%s\n' "$free_bytes"
printf 'timer=%s/%s service=%s\n' "$timer_enabled" "$timer_active" "$service_active"

[[ "$apply" -eq 1 ]] || exit 0

install -d -m 0750 -- "$archive_root"
for target in "$archive_path" "$manifest_path" "$archive_hash_path" "$metadata_path"; do
  [[ ! -e "$target" ]] || fail "archive artifact already exists: $target"
done

archive_partial="$archive_path.partial"
manifest_partial="$manifest_path.partial"
hash_partial="$archive_hash_path.partial"
metadata_partial="$metadata_path.partial"
metadata_update="$metadata_path.update"
trap 'rm -f -- "$archive_partial" "$manifest_partial" "$hash_partial" "$metadata_partial" "$metadata_update"' EXIT

(
  cd -- "$source_real"
  find . -xdev -type f -print0 | LC_ALL=C sort -z | xargs -0 -r sha256sum
) > "$manifest_partial"

manifest_sha256="$(sha256sum "$manifest_partial" | cut -d' ' -f1)"
tar --zstd --create --file="$archive_partial" --directory="$legacy_real" "$source_name"
zstd --test --quiet "$archive_partial"
tar --zstd --compare --file="$archive_partial" --directory="$legacy_real" "$source_name"

archive_sha256="$(sha256sum "$archive_partial" | cut -d' ' -f1)"
archive_bytes="$(stat -c '%s' "$archive_partial")"
printf '%s  %s\n' "$archive_sha256" "$(basename -- "$archive_path")" > "$hash_partial"

archived_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat > "$metadata_partial" <<EOF
{
  "schema_version": "MEE_LEGACY_ARTIFACT_ARCHIVE_V1",
  "archived_at": "$archived_at",
  "host": "$(hostname)",
  "source_path": "$source_real",
  "source_bytes": $source_bytes,
  "source_file_count": $source_files,
  "source_manifest": "$(basename -- "$manifest_path")",
  "source_manifest_sha256": "$manifest_sha256",
  "archive_path": "$archive_path",
  "archive_bytes": $archive_bytes,
  "archive_sha256": "$archive_sha256",
  "zstd_test": "passed",
  "tar_compare": "passed",
  "source_removal_status": "authorized_pending",
  "restore_command": "bash scripts/ops/mee_legacy_artifact_restore_v1.sh --archive=$archive_path --manifest=$manifest_path --destination-root=$legacy_real --apply"
}
EOF

mv -- "$archive_partial" "$archive_path"
mv -- "$manifest_partial" "$manifest_path"
mv -- "$hash_partial" "$archive_hash_path"
mv -- "$metadata_partial" "$metadata_path"
sync -f "$archive_path"
(
  cd -- "$archive_root"
  sha256sum --check --status "$(basename -- "$archive_hash_path")"
)

case "$source_real" in
  "$legacy_real"/mee_11l_market_listing_acquisition_daily_batch_fetch_*|\
  "$legacy_real"/mee_11m_market_listing_acquisition_daily_batch_backfill_plan_*) ;;
  *) fail "final source deletion guard rejected path: $source_real" ;;
esac
[[ "$(dirname -- "$(realpath -e -- "$source_real")")" == "$legacy_real" ]] || fail "source moved before removal"
rm -rf --one-file-system -- "$source_real"
[[ ! -e "$source_real" ]] || fail "source still exists after verified removal"
sed 's/"source_removal_status": "authorized_pending"/"source_removal_status": "completed_verified"/' \
  "$metadata_path" > "$metadata_update"
mv -- "$metadata_update" "$metadata_path"
sync -f "$metadata_path"

trap - EXIT
free_bytes_after="$(df --output=avail -B1 -- "$legacy_real" | tail -1 | tr -d ' ')"
printf 'archive_sha256=%s\n' "$archive_sha256"
printf 'manifest_sha256=%s\n' "$manifest_sha256"
printf 'archive_bytes=%s\n' "$archive_bytes"
printf 'free_bytes_after=%s\n' "$free_bytes_after"
printf 'status=archived_verified_source_removed\n'
