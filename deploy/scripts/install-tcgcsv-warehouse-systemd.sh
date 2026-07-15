#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
ENV_DIR="${ENV_DIR:-/etc/grookai}"
ENV_FILE="${ENV_FILE:-${ENV_DIR}/mee-nightly.env}"
SERVICE_NAME="grookai-tcgcsv-warehouse.service"
TIMER_NAME="grookai-tcgcsv-warehouse.timer"

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

if [[ ! -f "scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs" ]]; then
  echo "Missing worker script. Set REPO_DIR to the Grookai repo path." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Create it from deploy/env/mee-nightly.env.example and fill database credentials first." >&2
  exit 1
fi

require_env_value "SUPABASE_DB_URL"

node --check scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs
node scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs \
  --mode=current \
  --dry-run \
  --limit-categories=1 \
  --limit-groups=1 \
  --out-dir=.tmp/tcgcsv_full_source_warehouse_systemd_smoke

tmp_service="$(mktemp)"
sed "s#^WorkingDirectory=.*#WorkingDirectory=${REPO_DIR}#" "deploy/systemd/${SERVICE_NAME}" > "${tmp_service}"
sudo cp "${tmp_service}" "/etc/systemd/system/${SERVICE_NAME}"
rm -f "${tmp_service}"
sudo cp "deploy/systemd/${TIMER_NAME}" "/etc/systemd/system/${TIMER_NAME}"
sudo systemctl daemon-reload
sudo systemctl reset-failed "${SERVICE_NAME}" "${TIMER_NAME}" 2>/dev/null || true
sudo systemctl enable --now "${TIMER_NAME}"

systemctl list-timers "${TIMER_NAME}" --no-pager
systemctl status "${TIMER_NAME}" --no-pager
