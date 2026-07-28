#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/grookai/tcgplayer-market-pricing.env}"
REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
SERVICE_NAME="grookai-tcgplayer-market-pipeline.service"
TIMER_NAME="grookai-tcgplayer-market-pipeline.timer"
LEGACY_TIMER="grookai-tcgcsv-warehouse.timer"
VERIFY_MODE="${1:---production}"
declare -a FAILURES=()

record_failure() {
  FAILURES+=("$1")
}

if [[ ! -d /run/systemd/system ]]; then
  echo "systemd_unavailable" >&2
  exit 1
fi

systemctl cat "${SERVICE_NAME}" --no-pager
systemctl cat "${TIMER_NAME}" --no-pager
systemctl show "${SERVICE_NAME}" \
  --property=OnFailure,OnFailureJobMode,Result,ExecMainStatus,NRestarts \
  --no-pager
systemctl show "${TIMER_NAME}" \
  --property=Unit,TimersCalendar,NextElapseUSecRealtime,LastTriggerUSecRealtime,Result \
  --no-pager

on_failure="$(systemctl show "${SERVICE_NAME}" --property=OnFailure --value)"
if [[ "${on_failure}" != *"grookai-operations-webhook@"* ]]; then
  record_failure "missing_operations_webhook_route"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  record_failure "missing_environment_file"
else
  if ! grep -Eq '^GROOKAI_OPERATIONS_WEBHOOK_URL=.+$' "${ENV_FILE}"; then
    record_failure "missing_operations_webhook_url"
  fi
  if ! grep -Eq '^GROOKAI_OPERATIONS_WEBHOOK_BEARER_TOKEN=.+$' "${ENV_FILE}"; then
    record_failure "missing_operations_webhook_bearer_token"
  fi
fi

if [[ "${VERIFY_MODE}" == "--production" ]]; then
  if ! systemctl is-enabled "${TIMER_NAME}" >/dev/null 2>&1; then
    record_failure "authoritative_timer_not_enabled"
  fi
  if ! systemctl is-active "${TIMER_NAME}" >/dev/null 2>&1; then
    record_failure "authoritative_timer_not_active"
  fi
  if systemctl is-enabled "${LEGACY_TIMER}" >/dev/null 2>&1; then
    record_failure "legacy_current_sync_timer_still_enabled"
  fi
  if ! grep -q '^TCGPLAYER_MARKET_SCHEDULE_MODE=production$' "${ENV_FILE}" 2>/dev/null; then
    record_failure "schedule_mode_not_production"
  fi
  if ! grep -q '^TCGPLAYER_MARKET_REPLACEMENT_VERIFIED=1$' "${ENV_FILE}" 2>/dev/null; then
    record_failure "replacement_not_verified"
  fi
elif [[ "${VERIFY_MODE}" == "--canary" ]]; then
  if ! systemctl is-enabled "${TIMER_NAME}" >/dev/null 2>&1; then
    record_failure "authoritative_timer_not_enabled"
  fi
  if ! systemctl is-active "${TIMER_NAME}" >/dev/null 2>&1; then
    record_failure "authoritative_timer_not_active"
  fi
  if systemctl is-enabled "${LEGACY_TIMER}" >/dev/null 2>&1; then
    record_failure "legacy_current_sync_timer_still_enabled"
  fi
  if ! grep -q '^TCGPLAYER_MARKET_SCHEDULE_MODE=canary$' "${ENV_FILE}" 2>/dev/null; then
    record_failure "schedule_mode_not_canary"
  fi
  canary_definition="$(
    awk -F= '$1 == "TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION" {
      value = substr($0, length($1) + 2)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^"|"$/, "", value)
      print value
      exit
    }' "${ENV_FILE}" 2>/dev/null
  )"
  if [[ -z "${canary_definition}" ]]; then
    record_failure "missing_canary_definition"
  else
    if [[ "${canary_definition}" = /* ]]; then
      canary_definition_path="${canary_definition}"
    else
      canary_definition_path="${REPO_DIR}/${canary_definition}"
    fi
    if [[ ! -f "${canary_definition_path}" ]]; then
      record_failure "canary_definition_not_found"
    fi
  fi
fi

echo
echo "Recent pipeline logs:"
journalctl -u "${SERVICE_NAME}" -n 120 --no-pager || true

echo
echo "Latest durable scheduled artifacts:"
find /var/lib/grookai/market-pricing -name scheduled_summary.json -printf '%T@ %p\n' 2>/dev/null \
  | sort -nr | head -5 || true

if ((${#FAILURES[@]} > 0)); then
  printf 'TCGPLAYER_MARKET_OPS_NOT_READY %s\n' "${FAILURES[*]}" >&2
  exit 1
fi

echo "TCGPLAYER_MARKET_OPS_READY"
