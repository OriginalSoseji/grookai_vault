#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
ENV_DIR="${ENV_DIR:-/etc/grookai}"
ENV_FILE="${ENV_FILE:-${ENV_DIR}/mee-nightly.env}"
STATE_DIR="${TCGCSV_HISTORICAL_BACKFILL_STATE_DIR:-/var/lib/grookai}"
OUT_DIR="${TCGCSV_HISTORICAL_BACKFILL_OUT_DIR:-docs/audits/market_evidence_engine_v1/tcgcsv_full_source_warehouse_v1}"
SERVICE_NAME="grookai-tcgcsv-historical-backfill.service"
START_ON_INSTALL="${TCGCSV_HISTORICAL_BACKFILL_START_ON_INSTALL:-0}"

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

if [[ ! -f "scripts/workers/tcgcsv_historical_backfill_agent_v1.sh" ]]; then
  echo "Missing historical backfill agent script. Set REPO_DIR to the Grookai repo path." >&2
  exit 1
fi

if [[ ! -f "scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs" ]]; then
  echo "Missing TCGCSV warehouse worker script. Set REPO_DIR to the Grookai repo path." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create it from deploy/env/mee-nightly.env.example and fill database credentials first." >&2
  exit 1
fi

require_env_value "SUPABASE_DB_URL"

node --check scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs
node --check scripts/workers/tcgcsv_historical_load_guard_v1.mjs
bash -n scripts/workers/tcgcsv_historical_backfill_agent_v1.sh

sudo mkdir -p "${STATE_DIR}"
mkdir -p "${OUT_DIR}"
sudo chown grookai:grookai "${STATE_DIR}"
sudo chown -R grookai:grookai "${OUT_DIR}"
chmod +x scripts/workers/tcgcsv_historical_backfill_agent_v1.sh

tmp_service="$(mktemp)"
sed "s#^WorkingDirectory=.*#WorkingDirectory=${REPO_DIR}#" "deploy/systemd/${SERVICE_NAME}" > "${tmp_service}"
sudo cp "${tmp_service}" "/etc/systemd/system/${SERVICE_NAME}"
rm -f "${tmp_service}"
sudo systemctl daemon-reload
sudo systemctl reset-failed "${SERVICE_NAME}" 2>/dev/null || true
sudo systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
sudo systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
if [[ "${START_ON_INSTALL}" == "1" ]]; then
  if [[ "$(env_value "TCGCSV_HISTORICAL_BACKFILL_ENABLED")" != "1" ]]; then
    echo "Refusing to start: ${ENV_FILE} must explicitly set TCGCSV_HISTORICAL_BACKFILL_ENABLED=1." >&2
    exit 1
  fi
  sudo systemctl start "${SERVICE_NAME}"
else
  echo "Installed ${SERVICE_NAME} as a non-recurring unit. Set TCGCSV_HISTORICAL_BACKFILL_ENABLED=1 and rerun with TCGCSV_HISTORICAL_BACKFILL_START_ON_INSTALL=1 for one guarded date."
fi

systemctl status "${SERVICE_NAME}" --no-pager || true
