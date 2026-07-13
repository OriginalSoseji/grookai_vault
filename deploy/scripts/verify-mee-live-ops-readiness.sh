#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"

declare -a FAILURES=()

require_systemd_host() {
  if ! command -v systemctl >/dev/null 2>&1; then
    echo "systemd_unavailable: systemctl is not installed" >&2
    exit 1
  fi

  if [[ ! -d /run/systemd/system ]]; then
    echo "systemd_unavailable: this host is not booted with systemd" >&2
    exit 1
  fi
}

record_failure() {
  FAILURES+=("$1")
}

print_failure_route_units() {
  local on_failure_units="$1"

  if [[ -z "${on_failure_units}" ]]; then
    return
  fi

  for unit_name in ${on_failure_units}; do
    echo
    echo "OnFailure target ${unit_name}:"
    systemctl cat "${unit_name}" --no-pager || true
  done
}

check_timer() {
  local timer_name="$1"
  local service_name="$2"

  echo
  echo "== ${timer_name} =="

  if ! systemctl is-enabled "${timer_name}" >/dev/null 2>&1; then
    record_failure "${timer_name}:not_enabled"
  fi
  systemctl is-enabled "${timer_name}" || true

  if ! systemctl is-active "${timer_name}" >/dev/null 2>&1; then
    record_failure "${timer_name}:not_active"
  fi
  systemctl is-active "${timer_name}" || true

  systemctl show "${timer_name}" \
    --property=Unit,NextElapseUSecRealtime,LastTriggerUSecRealtime,Result \
    --no-pager || true

  echo
  echo "== ${service_name} failure route =="
  systemctl show "${service_name}" \
    --property=OnFailure,FailureAction,OnFailureJobMode,Result,NRestarts \
    --no-pager || true

  local on_failure
  local failure_action
  on_failure="$(systemctl show "${service_name}" --property=OnFailure --value 2>/dev/null || true)"
  failure_action="$(systemctl show "${service_name}" --property=FailureAction --value 2>/dev/null || true)"
  print_failure_route_units "${on_failure}"

  if [[ -z "${on_failure}" && ( -z "${failure_action}" || "${failure_action}" == "none" ) ]]; then
    record_failure "${service_name}:no_human_alert_route_configured"
  fi

  echo
  echo "Recent ${service_name} logs:"
  journalctl -u "${service_name}" -n 80 --no-pager || true
}

require_systemd_host
cd "${REPO_DIR}"

check_timer "grookai-mee-reference-refresh.timer" "grookai-mee-reference-refresh.service"
check_timer "grookai-mee-nightly.timer" "grookai-mee-nightly.service"

echo
echo "== readiness result =="
if ((${#FAILURES[@]} > 0)); then
  printf 'MEE_LIVE_OPS_NOT_READY %s\n' "${FAILURES[*]}" >&2
  exit 1
fi

echo "MEE_LIVE_OPS_READY"
