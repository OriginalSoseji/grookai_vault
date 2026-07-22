#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
STATE_DIR="${TCGCSV_HISTORICAL_BACKFILL_STATE_DIR:-/var/lib/grookai}"
STATE_FILE="${TCGCSV_HISTORICAL_BACKFILL_STATE_FILE:-${STATE_DIR}/tcgcsv-historical-backfill.next-date}"
STOP_FILE="${TCGCSV_HISTORICAL_BACKFILL_STOP_FILE:-${STATE_DIR}/tcgcsv-historical-backfill.stop}"
LOCK_FILE="${TCGCSV_HISTORICAL_BACKFILL_LOCK_FILE:-/tmp/grookai-tcgcsv-warehouse.lock}"
ENABLED="${TCGCSV_HISTORICAL_BACKFILL_ENABLED:-0}"
START_DATE="${TCGCSV_HISTORICAL_BACKFILL_START_DATE:-2024-02-17}"
END_DATE="${TCGCSV_HISTORICAL_BACKFILL_END_DATE:-$(date -u -d 'yesterday' +%F)}"
MAX_DAYS="${TCGCSV_HISTORICAL_BACKFILL_MAX_DAYS:-1}"
MAX_RUNTIME_SECONDS="${TCGCSV_HISTORICAL_BACKFILL_MAX_RUNTIME_SECONDS:-7200}"
LOAD_GUARD_ENABLED="${TCGCSV_HISTORICAL_BACKFILL_LOAD_GUARD_ENABLED:-1}"
OUT_DIR="${TCGCSV_HISTORICAL_BACKFILL_OUT_DIR:-docs/audits/market_evidence_engine_v1/tcgcsv_full_source_warehouse_v1}"
REQUEST_CEILING="${TCGCSV_HISTORICAL_BACKFILL_REQUEST_CEILING:-10}"
PAUSE_START_HHMM="${TCGCSV_HISTORICAL_BACKFILL_PAUSE_START_HHMM:-0050}"
PAUSE_END_HHMM="${TCGCSV_HISTORICAL_BACKFILL_PAUSE_END_HHMM:-1030}"
CLEANUP_EXTRACTED="${TCGCSV_HISTORICAL_BACKFILL_CLEANUP_EXTRACTED:-1}"

if [[ "${ENABLED}" != "1" ]]; then
  echo "[tcgcsv-history-agent] disabled set_TCGCSV_HISTORICAL_BACKFILL_ENABLED=1_for_a_controlled_run"
  exit 0
fi

cd "${REPO_DIR}"
mkdir -p "${STATE_DIR}"

if ! command -v flock >/dev/null 2>&1; then
  echo "[tcgcsv-history-agent] missing_required_command command=flock" >&2
  exit 69
fi
if ! command -v timeout >/dev/null 2>&1; then
  echo "[tcgcsv-history-agent] missing_required_command command=timeout" >&2
  exit 69
fi

if [[ "${MAX_DAYS}" != "1" ]]; then
  echo "[tcgcsv-history-agent] invalid_MAX_DAYS value=${MAX_DAYS} required=1" >&2
  exit 2
fi
if ! [[ "${MAX_RUNTIME_SECONDS}" =~ ^[1-9][0-9]*$ ]]; then
  echo "[tcgcsv-history-agent] invalid_MAX_RUNTIME_SECONDS value=${MAX_RUNTIME_SECONDS}" >&2
  exit 2
fi

agent_started_epoch="$(date -u +%s)"
tmp_output=""

cleanup_tmp_output() {
  if [[ -n "${tmp_output}" && -f "${tmp_output}" ]]; then
    rm -f "${tmp_output}"
  fi
}
trap cleanup_tmp_output EXIT
trap 'exit 130' INT
trap 'exit 143' TERM


next_day() {
  date -u -d "${1} +1 day" +%F
}

valid_date() {
  [[ "${1:-}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]
}

current_hhmm() {
  date -u +%H%M
}

runtime_remaining_seconds() {
  local elapsed
  elapsed=$(( $(date -u +%s) - agent_started_epoch ))
  echo $(( MAX_RUNTIME_SECONDS - elapsed ))
}

inside_pause_window() {
  local now
  now="$(current_hhmm)"
  [[ "${now}" > "${PAUSE_START_HHMM}" || "${now}" == "${PAUSE_START_HHMM}" ]] && [[ "${now}" < "${PAUSE_END_HHMM}" ]]
}

pause_for_pricing_window() {
  while inside_pause_window; do
    local remaining sleep_seconds
    remaining="$(runtime_remaining_seconds)"
    if [[ "${remaining}" -le 0 ]]; then
      echo "[tcgcsv-history-agent] max_runtime_reached_during_pause next_date=${current}"
      return 75
    fi
    sleep_seconds=600
    if [[ "${remaining}" -lt "${sleep_seconds}" ]]; then
      sleep_seconds="${remaining}"
    fi
    echo "[tcgcsv-history-agent] paused_for_pricing_window now=$(date -u +%FT%TZ) window=${PAUSE_START_HHMM}-${PAUSE_END_HHMM}Z"
    sleep "${sleep_seconds}"
  done
}

cleanup_extracted_dirs() {
  if [[ "${CLEANUP_EXTRACTED}" != "1" ]]; then
    return 0
  fi
  find "${OUT_DIR}" -path "*/extracted" -type d -prune -exec rm -rf {} +
}

run_load_guard() {
  if [[ "${LOAD_GUARD_ENABLED}" != "1" ]]; then
    return 0
  fi

  local guard_status=0
  node scripts/workers/tcgcsv_historical_load_guard_v1.mjs || guard_status="$?"

  if [[ "${guard_status}" -eq 75 ]]; then
    echo "[tcgcsv-history-agent] deferred_database_busy date=${current}"
    return 75
  fi
  if [[ "${guard_status}" -ne 0 ]]; then
    echo "[tcgcsv-history-agent] load_guard_failed status=${guard_status}" >&2
    return "${guard_status}"
  fi
  return 0
}

write_state_atomically() {
  local next_date="$1"
  local state_tmp
  state_tmp="$(mktemp "${STATE_FILE}.tmp.XXXXXX")"
  printf "%s\n" "${next_date}" > "${state_tmp}"
  mv -f "${state_tmp}" "${STATE_FILE}"
}

current="${START_DATE}"
if [[ -f "${STATE_FILE}" ]]; then
  saved="$(tr -d '[:space:]' < "${STATE_FILE}")"
  if valid_date "${saved}" && [[ "${saved}" > "${current}" || "${saved}" == "${current}" ]]; then
    current="${saved}"
  fi
fi

if [[ "${current}" > "${END_DATE}" ]]; then
  echo "[tcgcsv-history-agent] already_complete next_date=${current} end_date=${END_DATE}"
  exit 0
fi

processed=0
while [[ "${current}" < "${END_DATE}" || "${current}" == "${END_DATE}" ]]; do
  if [[ -f "${STOP_FILE}" ]]; then
    echo "[tcgcsv-history-agent] stop_file_present path=${STOP_FILE}"
    exit 0
  fi
  if [[ "${processed}" -ge "${MAX_DAYS}" ]]; then
    echo "[tcgcsv-history-agent] max_days_reached processed=${processed} next_date=${current}"
    exit 0
  fi
  elapsed_seconds=$(( $(date -u +%s) - agent_started_epoch ))
  if [[ "${elapsed_seconds}" -ge "${MAX_RUNTIME_SECONDS}" ]]; then
    echo "[tcgcsv-history-agent] max_runtime_reached elapsed_seconds=${elapsed_seconds} next_date=${current}"
    exit 0
  fi

  pause_status=0
  pause_for_pricing_window || pause_status="$?"
  if [[ "${pause_status}" -eq 75 ]]; then
    exit 0
  fi
  if [[ "${pause_status}" -ne 0 ]]; then
    exit "${pause_status}"
  fi

  # Do not hold the shared current/historical warehouse lock while waiting for
  # the pricing window to close. Once the pause is over, acquire it
  # non-blockingly and keep it only for the guarded worker run.
  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    echo "[tcgcsv-history-agent] deferred_local_worker_locked path=${LOCK_FILE}"
    exit 0
  fi

  load_guard_status=0
  run_load_guard || load_guard_status="$?"
  if [[ "${load_guard_status}" -ne 0 ]]; then
    if [[ "${load_guard_status}" -eq 75 ]]; then
      exit 0
    fi
    exit "${load_guard_status}"
  fi

  elapsed_seconds=$(( $(date -u +%s) - agent_started_epoch ))
  remaining_seconds=$(( MAX_RUNTIME_SECONDS - elapsed_seconds ))
  if [[ "${remaining_seconds}" -le 0 ]]; then
    echo "[tcgcsv-history-agent] max_runtime_reached elapsed_seconds=${elapsed_seconds} next_date=${current}"
    exit 0
  fi

  echo "[tcgcsv-history-agent] date_start date=${current} at=$(date -u +%FT%TZ)"
  tmp_output="$(mktemp)"
  set +e
  TCGCSV_ARTIFACT_BATCH_SIZE="${TCGCSV_ARTIFACT_BATCH_SIZE:-2000}" \
  TCGCSV_HISTORICAL_PRODUCT_BATCH_SIZE="${TCGCSV_HISTORICAL_PRODUCT_BATCH_SIZE:-5000}" \
  TCGCSV_PRICE_OBSERVATION_BATCH_SIZE="${TCGCSV_PRICE_OBSERVATION_BATCH_SIZE:-1000}" \
    timeout --signal=TERM --kill-after=120s "${remaining_seconds}s" \
      node scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs \
      --mode=historical \
      --apply \
      --date="${current}" \
      --out-dir="${OUT_DIR}" \
      --request-ceiling="${REQUEST_CEILING}" 2>&1 | tee "${tmp_output}"
  worker_status="${PIPESTATUS[0]}"
  set -e

  if [[ "${worker_status}" -eq 124 || "${worker_status}" -eq 137 ]]; then
    echo "[tcgcsv-history-agent] worker_timed_out date=${current} status=${worker_status} runtime_budget_seconds=${remaining_seconds}" >&2
    exit "${worker_status}"
  fi
  if [[ "${worker_status}" -ne 0 ]]; then
    echo "[tcgcsv-history-agent] worker_failed date=${current} status=${worker_status}"
    exit "${worker_status}"
  fi
  worker_result="$(sed -n 's/^\[tcgcsv-full\] status=//p' "${tmp_output}" | tail -n 1)"
  case "${worker_result}" in
    completed|skipped_already_completed)
      ;;
    skipped_worker_locked)
      echo "[tcgcsv-history-agent] deferred_production_worker_locked date=${current}"
      exit 0
      ;;
    *)
      echo "[tcgcsv-history-agent] worker_not_completed date=${current} result=${worker_result:-missing}" >&2
      exit 1
      ;;
  esac
  rm -f "${tmp_output}"
  tmp_output=""

  cleanup_extracted_dirs

  current="$(next_day "${current}")"
  write_state_atomically "${current}"
  processed=$((processed + 1))
  echo "[tcgcsv-history-agent] date_done next_date=${current} processed=${processed} at=$(date -u +%FT%TZ)"
done

echo "[tcgcsv-history-agent] complete end_date=${END_DATE} next_date=${current} processed=${processed}"
