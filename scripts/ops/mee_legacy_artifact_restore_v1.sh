#!/usr/bin/env bash
set -euo pipefail

archive_path=""
manifest_path=""
destination_root=""
apply=0

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

for arg in "$@"; do
  case "$arg" in
    --archive=*) archive_path="${arg#*=}" ;;
    --manifest=*) manifest_path="${arg#*=}" ;;
    --destination-root=*) destination_root="${arg#*=}" ;;
    --apply) apply=1 ;;
    *) fail "unknown argument: $arg" ;;
  esac
done

[[ "$archive_path" = /* ]] || fail "--archive must be absolute"
[[ "$manifest_path" = /* ]] || fail "--manifest must be absolute"
[[ "$destination_root" = /* ]] || fail "--destination-root must be absolute"
[[ -f "$archive_path" && ! -L "$archive_path" ]] || fail "archive must be a regular file"
[[ -f "$manifest_path" && ! -L "$manifest_path" ]] || fail "manifest must be a regular file"
[[ -d "$destination_root" && ! -L "$destination_root" ]] || fail "destination root must be an existing directory"

archive_name="$(basename -- "$archive_path")"
source_name="${archive_name%.tar.zst}"
[[ "$source_name" != "$archive_name" ]] || fail "archive must end in .tar.zst"
case "$source_name" in
  mee_11l_market_listing_acquisition_daily_batch_fetch_*) ;;
  mee_11m_market_listing_acquisition_daily_batch_backfill_plan_*) ;;
  *) fail "archive name is outside the restore allowlist" ;;
esac

destination_real="$(realpath -e -- "$destination_root")"
restored_path="$destination_real/$source_name"
[[ ! -e "$restored_path" ]] || fail "restore target already exists: $restored_path"

zstd --test --quiet "$archive_path"
archive_entries="$(tar --zstd --list --file="$archive_path")"
first_entry="${archive_entries%%$'\n'*}"
first_entry="${first_entry%/}"
[[ "$first_entry" == "$source_name" ]] || fail "archive root does not match expected source name"
if grep -Eq '(^/|(^|/)\.\.(/|$))' <<< "$archive_entries"; then
  fail "archive contains an unsafe path"
fi

printf 'mode=%s\n' "$([[ "$apply" -eq 1 ]] && printf apply || printf plan)"
printf 'archive=%s\n' "$archive_path"
printf 'manifest=%s\n' "$manifest_path"
printf 'destination=%s\n' "$restored_path"
[[ "$apply" -eq 1 ]] || exit 0

tar --zstd --extract --file="$archive_path" --directory="$destination_real"
[[ -d "$restored_path" ]] || fail "restore did not create the expected directory"
(
  cd -- "$restored_path"
  sha256sum --check --status "$manifest_path"
)
printf 'status=restored_and_manifest_verified\n'
