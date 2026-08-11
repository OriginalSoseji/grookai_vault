#!/usr/bin/env bash
set -euo pipefail

bundle_id="${GROOKAI_IOS_BUNDLE_ID:-com.cesar.grookaivault}"
env_file="${GROOKAI_ENV_FILE:-$HOME/grookai_vault/.env.local}"
credential_file="${GROOKAI_UI_CREDENTIAL_FILE:-$HOME/grookai_physical_xcuitest_20260808/GrookaiPhysicalUITests.swift}"
storage_key="${GROOKAI_SUPABASE_STORAGE_KEY:-flutter.sb-ycdxbpibncqcchqiihfz-auth-token}"

cleanup() {
  unset email password supabase_url anon_key session_json
}
trap cleanup EXIT

for command_name in curl jq xcrun; do
  command -v "$command_name" >/dev/null || {
    echo "missing required command: $command_name" >&2
    exit 1
  }
done

[[ -f "$env_file" ]] || {
  echo "environment file unavailable" >&2
  exit 1
}
[[ -f "$credential_file" ]] || {
  echo "disposable credential source unavailable" >&2
  exit 1
}

read_env_value() {
  local key="$1"
  sed -nE "s/^(export[[:space:]]+)?${key}=['\"]?([^'\"]+)['\"]?$/\\2/p" "$env_file" |
    tail -1 |
    tr -d '\r' |
    sed -E 's/[[:space:]]+$//'
}

supabase_url="$(read_env_value SUPABASE_URL)"
[[ -n "$supabase_url" ]] || supabase_url="$(read_env_value NEXT_PUBLIC_SUPABASE_URL)"
anon_key="$(read_env_value SUPABASE_ANON_KEY)"
[[ -n "$anon_key" ]] || anon_key="$(read_env_value NEXT_PUBLIC_SUPABASE_ANON_KEY)"
[[ -n "$anon_key" ]] || anon_key="$(read_env_value SUPABASE_PUBLISHABLE_KEY)"

email="$(grep -Eo 'release-journey-[A-Za-z0-9_-]+@example\.invalid' "$credential_file" | head -1 || true)"
password="$(grep -Eo 'Gv![A-Za-z0-9_-]+' "$credential_file" | head -1 || true)"

[[ -n "$supabase_url" && -n "$anon_key" ]] || {
  echo "Supabase public configuration unavailable" >&2
  exit 1
}
[[ -n "$email" && -n "$password" ]] || {
  echo "disposable UI credentials unavailable" >&2
  exit 1
}

session_json="$(
  jq -n --arg email "$email" --arg password "$password" \
    '{email: $email, password: $password}' |
    curl --fail-with-body --silent --show-error \
      --request POST \
      --header "apikey: $anon_key" \
      --header 'Content-Type: application/json' \
      --data-binary @- \
      "$supabase_url/auth/v1/token?grant_type=password"
)"

jq -e '
  (.access_token | type == "string" and length > 0) and
  (.refresh_token | type == "string" and length > 0) and
  (.user.id | type == "string" and length > 0)
' <<<"$session_json" >/dev/null

xcrun simctl terminate booted "$bundle_id" >/dev/null 2>&1 || true
xcrun simctl spawn booted defaults delete "$bundle_id" "$storage_key" \
  >/dev/null 2>&1 || true

data_container="$(xcrun simctl get_app_container booted "$bundle_id" data)"
preferences_plist="$data_container/Library/Preferences/$bundle_id.plist"
[[ -f "$preferences_plist" ]] || {
  echo "app preferences file unavailable" >&2
  exit 1
}

plist_key_path="${storage_key//./\\.}"
if plutil -extract "$plist_key_path" raw -o - "$preferences_plist" \
  >/dev/null 2>&1; then
  plutil -replace "$plist_key_path" -string "$session_json" "$preferences_plist"
else
  plutil -insert "$plist_key_path" -string "$session_json" "$preferences_plist"
fi
xcrun simctl spawn booted killall cfprefsd >/dev/null 2>&1 || true

stored_length="$(
  plutil -extract "$plist_key_path" raw -o - "$preferences_plist" |
    wc -c |
    tr -d ' '
)"
if [[ "$stored_length" -lt 100 ]]; then
  echo "session persistence verification failed" >&2
  exit 1
fi

echo "Disposable simulator session installed; stored_length=$stored_length"
