#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
STATE_DIR="${TCGCSV_HISTORICAL_BACKFILL_STATE_DIR:-/var/lib/grookai}"
STATE_FILE="${TCGCSV_HISTORICAL_BACKFILL_STATE_FILE:-${STATE_DIR}/tcgcsv-historical-backfill.next-date}"
STOP_FILE="${TCGCSV_HISTORICAL_BACKFILL_STOP_FILE:-${STATE_DIR}/tcgcsv-historical-backfill.stop}"
START_DATE="${TCGCSV_HISTORICAL_BACKFILL_START_DATE:-2024-02-17}"
END_DATE="${TCGCSV_HISTORICAL_BACKFILL_END_DATE:-$(date -u -d 'yesterday' +%F)}"
MAX_DAYS="${TCGCSV_HISTORICAL_BACKFILL_MAX_DAYS:-0}"
OUT_DIR="${TCGCSV_HISTORICAL_BACKFILL_OUT_DIR:-docs/audits/market_evidence_engine_v1/tcgcsv_full_source_warehouse_v1}"
REQUEST_CEILING="${TCGCSV_HISTORICAL_BACKFILL_REQUEST_CEILING:-10}"
PAUSE_START_HHMM="${TCGCSV_HISTORICAL_BACKFILL_PAUSE_START_HHMM:-0050}"
PAUSE_END_HHMM="${TCGCSV_HISTORICAL_BACKFILL_PAUSE_END_HHMM:-1030}"
CLEANUP_EXTRACTED="${TCGCSV_HISTORICAL_BACKFILL_CLEANUP_EXTRACTED:-1}"

cd "${REPO_DIR}"
mkdir -p "${STATE_DIR}"

next_day() {
  date -u -d "${1} +1 day" +%F
}

valid_date() {
  [[ "${1:-}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]
}

current_hhmm() {
  date -u +%H%M
}

inside_pause_window() {
  local now
  now="$(current_hhmm)"
  [[ "${now}" > "${PAUSE_START_HHMM}" || "${now}" == "${PAUSE_START_HHMM}" ]] && [[ "${now}" < "${PAUSE_END_HHMM}" ]]
}

pause_for_pricing_window() {
  while inside_pause_window; do
    echo "[tcgcsv-history-agent] paused_for_pricing_window now=$(date -u +%FT%TZ) window=${PAUSE_START_HHMM}-${PAUSE_END_HHMM}Z"
    sleep 600
  done
}

cleanup_extracted_dirs() {
  if [[ "${CLEANUP_EXTRACTED}" != "1" ]]; then
    return 0
  fi
  find "${OUT_DIR}" -path "*/extracted" -type d -prune -exec rm -rf {} +
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
  if [[ "${MAX_DAYS}" != "0" && "${processed}" -ge "${MAX_DAYS}" ]]; then
    echo "[tcgcsv-history-agent] max_days_reached processed=${processed} next_date=${current}"
    exit 0
  fi

  pause_for_pricing_window

  echo "[tcgcsv-history-agent] date_start date=${current} at=$(date -u +%FT%TZ)"
  tmp_output="$(mktemp)"
  set +e
  TCGCSV_ARTIFACT_BATCH_SIZE="${TCGCSV_ARTIFACT_BATCH_SIZE:-1000}" \
  TCGCSV_PRICE_OBSERVATION_BATCH_SIZE="${TCGCSV_PRICE_OBSERVATION_BATCH_SIZE:-500}" \
    node scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs \
      --mode=historical \
      --apply \
      --date="${current}" \
      --out-dir="${OUT_DIR}" \
      --request-ceiling="${REQUEST_CEILING}" 2>&1 | tee "${tmp_output}"
  worker_status="${PIPESTATUS[0]}"
  set -e

  if [[ "${worker_status}" -ne 0 ]]; then
    echo "[tcgcsv-history-agent] worker_failed date=${current} status=${worker_status}"
    rm -f "${tmp_output}"
    exit "${worker_status}"
  fi
  if ! grep -q "\\[tcgcsv-full\\] status=completed" "${tmp_output}"; then
    echo "[tcgcsv-history-agent] worker_not_completed date=${current}"
    rm -f "${tmp_output}"
    exit 1
  fi
  rm -f "${tmp_output}"

  cleanup_extracted_dirs

  current="$(next_day "${current}")"
  printf "%s\n" "${current}" > "${STATE_FILE}"
  processed=$((processed + 1))
  echo "[tcgcsv-history-agent] date_done next_date=${current} processed=${processed} at=$(date -u +%FT%TZ)"
done

echo "[tcgcsv-history-agent] complete end_date=${END_DATE} next_date=${current} processed=${processed}"
