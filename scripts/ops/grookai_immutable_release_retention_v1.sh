#!/usr/bin/env bash
set -euo pipefail

schema_version="GROOKAI_IMMUTABLE_RELEASE_RETENTION_V1"
target_free_bytes="${GROOKAI_RELEASE_RETENTION_TARGET_FREE_BYTES:-21474836480}"
minimum_age_hours="${GROOKAI_RELEASE_RETENTION_MINIMUM_AGE_HOURS:-24}"
active_family_keep="${GROOKAI_RELEASE_RETENTION_ACTIVE_FAMILY_KEEP:-2}"
inactive_family_keep="${GROOKAI_RELEASE_RETENTION_INACTIVE_FAMILY_KEEP:-1}"
apply=0

release_roots=(
  /opt/grookai/releases/backend
  /opt/grookai/releases/mee
  /opt/grookai/releases/control-plane
  /opt/grookai/releases/market-intelligence
)

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: grookai_immutable_release_retention_v1.sh [options]

The default mode is a read-only plan. Apply mode removes only verified,
inactive immutable Git checkouts until the target free-space floor is met.

Options:
  --apply
  --target-free-bytes=<integer>
  --minimum-age-hours=<integer>
  --active-family-keep=<integer>
  --inactive-family-keep=<integer>
EOF
}

for arg in "$@"; do
  case "$arg" in
    --apply) apply=1 ;;
    --target-free-bytes=*) target_free_bytes="${arg#*=}" ;;
    --minimum-age-hours=*) minimum_age_hours="${arg#*=}" ;;
    --active-family-keep=*) active_family_keep="${arg#*=}" ;;
    --inactive-family-keep=*) inactive_family_keep="${arg#*=}" ;;
    --help|-h) usage; exit 0 ;;
    *) fail "unknown argument: $arg" ;;
  esac
done

for value in "$target_free_bytes" "$minimum_age_hours" "$active_family_keep" "$inactive_family_keep"; do
  [[ "$value" =~ ^[0-9]+$ ]] || fail "retention settings must be non-negative integers"
done
[[ "$active_family_keep" -ge 1 ]] || fail "active family keep must be at least one"
[[ "$inactive_family_keep" -ge 1 ]] || fail "inactive family keep must be at least one"
if [[ "$apply" -eq 1 ]]; then
  [[ "${EUID}" -eq 0 ]] || fail "apply mode must run as root"
  exec 9>/run/lock/grookai-immutable-release-retention.lock
  flock -n 9 || fail "another immutable release retention run holds the lock"
fi

declare -A allowed_roots=()
declare -A protected_releases=()
declare -A active_families=()
declare -A keep_reasons=()
resolved_roots=()

for root in "${release_roots[@]}"; do
  [[ -d "$root" ]] || continue
  root_real="$(realpath -e -- "$root")"
  allowed_roots["$root_real"]=1
  resolved_roots+=("$root_real")
done
[[ "${#resolved_roots[@]}" -gt 0 ]] || fail "no allowlisted release roots exist"

protect_release_path() {
  local candidate="$1"
  local reason="$2"
  local root
  local release
  local relative
  local release_name
  [[ -n "$candidate" ]] || return 0
  for root in "${resolved_roots[@]}"; do
    case "$candidate" in
      "$root"/*)
        relative="${candidate#"$root"/}"
        release_name="${relative%%/*}"
        release="$root/$release_name"
        [[ -d "$release" ]] || return 0
        protected_releases["$release"]=1
        active_families["$root"]=1
        keep_reasons["$release"]="${keep_reasons[$release]:+${keep_reasons[$release]},}$reason"
        return 0
        ;;
    esac
  done
}

for link in /opt/grookai_*_current; do
  [[ -L "$link" ]] || continue
  protect_release_path "$(readlink -f -- "$link" 2>/dev/null || true)" "active_symlink:$link"
done

for cwd_link in /proc/[0-9]*/cwd; do
  [[ -L "$cwd_link" ]] || continue
  protect_release_path "$(readlink -f -- "$cwd_link" 2>/dev/null || true)" "process_cwd"
done

for root in "${resolved_roots[@]}"; do
  keep_count="$inactive_family_keep"
  [[ -n "${active_families[$root]:-}" ]] && keep_count="$active_family_keep"
  kept=0
  while IFS= read -r release; do
    [[ -n "$release" ]] || continue
    if [[ "$kept" -lt "$keep_count" ]]; then
      protected_releases["$release"]=1
      keep_reasons["$release"]="${keep_reasons[$release]:+${keep_reasons[$release]},}newest_family_release"
      kept="$((kept + 1))"
    fi
  done < <(find "$root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)
done

reference_root="${resolved_roots[0]}"
free_bytes_before="$(df --output=avail -B1 -- "$reference_root" | tail -1 | tr -d ' ')"
printf 'schema_version=%s\n' "$schema_version"
printf 'mode=%s\n' "$([[ "$apply" -eq 1 ]] && printf apply || printf plan)"
printf 'free_bytes_before=%s\n' "$free_bytes_before"
printf 'target_free_bytes=%s\n' "$target_free_bytes"

for release in "${!protected_releases[@]}"; do
  printf 'protected=%s reason=%s\n' "$release" "${keep_reasons[$release]}"
done | sort

minimum_age_minutes="$((minimum_age_hours * 60))"
candidate_records=()
for root in "${resolved_roots[@]}"; do
  while IFS= read -r record; do
    [[ -n "$record" ]] && candidate_records+=("$record")
  done < <(find "$root" -mindepth 1 -maxdepth 1 -type d -mmin "+$minimum_age_minutes" -printf '%T@ %p\n')
done

projected_free_bytes="$free_bytes_before"
removed_count=0
while IFS= read -r record; do
  [[ -n "$record" ]] || continue
  source_path="${record#* }"
  source_real="$(realpath -e -- "$source_path")"
  root_real="$(dirname -- "$source_real")"
  [[ -n "${allowed_roots[$root_real]:-}" ]] || fail "candidate escaped the allowlisted roots: $source_real"
  [[ ! -L "$source_path" ]] || fail "candidate may not be a symlink: $source_path"
  [[ -z "${protected_releases[$source_real]:-}" ]] || continue
  release_identity=""
  if [[ -d "$source_real/.git" ]]; then
    [[ -z "$(git -C "$source_real" status --porcelain)" ]] || fail "candidate has tracked or untracked changes: $source_real"
    release_sha="$(git -C "$source_real" rev-parse HEAD)"
    release_identity="clean_git_checkout"
  elif [[ -f "$source_real/.release-sha" ]]; then
    release_sha="$(head -n 1 -- "$source_real/.release-sha" | tr -d '[:space:]')"
    release_identity="packaged_release_sha"
  elif [[ -f "$source_real/RELEASE_COMMIT_SHA" ]]; then
    release_sha="$(head -n 1 -- "$source_real/RELEASE_COMMIT_SHA" | tr -d '[:space:]')"
    release_identity="packaged_release_commit_sha"
  else
    fail "candidate has no governed release identity: $source_real"
  fi
  [[ "$release_sha" =~ ^[0-9a-f]{40}$ ]] || fail "candidate release SHA is invalid: $source_real"
  release_name="$(basename -- "$source_real")"
  [[ "$release_sha" == "$release_name"* ]] || fail "release directory does not match Git SHA: $source_real"
  source_bytes="$(du -sb -- "$source_real" | cut -f1)"
  printf 'candidate=%s sha=%s identity=%s source_bytes=%s\n' "$source_real" "$release_sha" "$release_identity" "$source_bytes"
  projected_free_bytes="$((projected_free_bytes + source_bytes))"

  if [[ "$apply" -eq 1 ]]; then
    current_free_bytes="$(df --output=avail -B1 -- "$reference_root" | tail -1 | tr -d ' ')"
    [[ "$current_free_bytes" -lt "$target_free_bytes" ]] || break
    [[ "$(dirname -- "$(realpath -e -- "$source_real")")" == "$root_real" ]] || fail "candidate moved before removal"
    [[ -z "${protected_releases[$source_real]:-}" ]] || fail "candidate became protected before removal"
    rm -rf --one-file-system -- "$source_real"
    [[ ! -e "$source_real" ]] || fail "candidate remains after removal: $source_real"
    removed_count="$((removed_count + 1))"
    current_free_bytes="$(df --output=avail -B1 -- "$reference_root" | tail -1 | tr -d ' ')"
    printf 'removed=%s free_bytes=%s\n' "$source_real" "$current_free_bytes"
  fi
done < <(printf '%s\n' "${candidate_records[@]}" | sort -n)

free_bytes_after="$(df --output=avail -B1 -- "$reference_root" | tail -1 | tr -d ' ')"
printf 'projected_free_bytes=%s\n' "$projected_free_bytes"
printf 'removed_count=%s\n' "$removed_count"
printf 'free_bytes_after=%s\n' "$free_bytes_after"

if [[ "$apply" -eq 1 ]]; then
  [[ "$free_bytes_after" -ge "$target_free_bytes" ]] || fail "target free-space floor was not reached"
  printf 'status=capacity_restored\n'
else
  [[ "$projected_free_bytes" -ge "$target_free_bytes" ]] || fail "eligible releases cannot restore the target free-space floor"
  printf 'status=plan_sufficient\n'
fi
