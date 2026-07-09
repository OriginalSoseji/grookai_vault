#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
ENV_DIR="${ENV_DIR:-/etc/grookai}"
ENV_FILE="${ENV_FILE:-${ENV_DIR}/mee-nightly.env}"
SERVICE_NAME="grookai-mee-reference-refresh.service"
TIMER_NAME="grookai-mee-reference-refresh.timer"

cd "${REPO_DIR}"

env_value() {
  local key="$1"
  awk -F= -v key="${key}" '
    $1 == key {
      value = substr($0, length(key) + 2)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^"|"$/, "", value)
      print value
      exit
    }
  ' "${ENV_FILE}"
}

require_env_value() {
  local key="$1"
  local value
  value="$(env_value "${key}")"
  if [[ -z "${value}" ]]; then
    echo "${ENV_FILE} must contain a non-empty ${key}." >&2
    exit 1
  fi
}

ensure_env_line() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sudo sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    echo "${key}=${value}" | sudo tee -a "${ENV_FILE}" >/dev/null
  fi
}

if [[ ! -f "scripts/workers/mee_reference_source_refresh_worker_v1.mjs" ]]; then
  echo "Missing reference refresh worker script. Set REPO_DIR to the Grookai repo path." >&2
  exit 1
fi

if [[ ! -f "scripts/audits/market_evidence_engine_query_plan_v1.mjs" ]]; then
  echo "Missing MEE query plan script. Set REPO_DIR to the Grookai repo path." >&2
  exit 1
fi

if [[ ! -f "scripts/audits/market_evidence_engine_acquisition_batch_v1.mjs" ]]; then
  echo "Missing MEE acquisition batch script. Set REPO_DIR to the Grookai repo path." >&2
  exit 1
fi

if [[ ! -f "scripts/audits/market_evidence_engine_normalized_reference_v1.mjs" ]]; then
  echo "Missing MEE reference normalizer script. Set REPO_DIR to the Grookai repo path." >&2
  exit 1
fi

if [[ ! -f "scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs" ]]; then
  echo "Missing reference warehouse delta writer script. Set REPO_DIR to the Grookai repo path." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}." >&2
  echo "Create it from deploy/env/mee-nightly.env.example and fill Supabase secrets before installing." >&2
  exit 1
fi

if [[ ! -r "${ENV_FILE}" ]]; then
  env_group="$(id -gn)"
  sudo chgrp "${env_group}" "${ENV_DIR}" "${ENV_FILE}"
  sudo chmod 750 "${ENV_DIR}"
  sudo chmod 640 "${ENV_FILE}"
fi

require_env_value "SUPABASE_URL"
require_env_value "SUPABASE_SECRET_KEY"

ensure_env_line "MEE_REFERENCE_REFRESH_ALLOW_RUN" "1"
ensure_env_line "MEE_REFERENCE_REFRESH_ALLOW_PROVIDER_CALLS" "1"
ensure_env_line "MEE_REFERENCE_REFRESH_ALLOW_INTERNAL_WRITES" "0"
ensure_env_line "MEE_REFERENCE_WAREHOUSE_DELTA_ALLOW_RUN" "1"
if [[ -z "$(env_value MEE_NIGHTLY_REFERENCE_LIMIT)" ]]; then
  ensure_env_line "MEE_NIGHTLY_REFERENCE_LIMIT" "5000"
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

reference_limit="$(env_value MEE_NIGHTLY_REFERENCE_LIMIT)"
if [[ -z "${reference_limit}" ]]; then
  reference_limit="5000"
fi

node scripts/audits/market_evidence_engine_query_plan_v1.mjs --limit="${reference_limit}"
node scripts/audits/market_evidence_engine_acquisition_batch_v1.mjs --sources=pokemontcg_io_reference,tcgcsv_reference --limit="${reference_limit}"
node scripts/workers/mee_reference_source_refresh_worker_v1.mjs --dry-run --sources=pokemontcg_io_reference,tcgcsv_reference --limit="${reference_limit}"
if ! node scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs --dry-run; then
  echo "Reference warehouse delta dry-run reported source artifact findings." >&2
  echo "Continuing install because the timer runs source refresh before the delta writer." >&2
fi

sudo cp "deploy/systemd/${SERVICE_NAME}.candidate" "/etc/systemd/system/${SERVICE_NAME}"
sudo cp "deploy/systemd/${TIMER_NAME}.candidate" "/etc/systemd/system/${TIMER_NAME}"
sudo systemctl daemon-reload
sudo systemctl enable --now "${TIMER_NAME}"

systemctl list-timers "${TIMER_NAME}" --no-pager
systemctl status "${TIMER_NAME}" --no-pager
