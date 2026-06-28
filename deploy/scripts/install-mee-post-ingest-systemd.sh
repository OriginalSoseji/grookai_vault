#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/grookai_vault_mee_nightly}"
ENV_DIR="${ENV_DIR:-/etc/grookai}"
ENV_FILE="${ENV_FILE:-${ENV_DIR}/mee-nightly.env}"
SERVICE_NAME="grookai-mee-post-ingest.service"
TIMER_NAME="grookai-mee-post-ingest.timer"

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

if [[ ! -f "scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs" ]]; then
  echo "Missing post-ingest worker script. Set REPO_DIR to the Grookai repo path." >&2
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

if [[ -z "$(env_value SUPABASE_SECRET_KEY)" && -z "$(env_value SUPABASE_SERVICE_ROLE_KEY)" ]]; then
  echo "${ENV_FILE} must contain SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY." >&2
  exit 1
fi

ensure_env_line "MEE_POST_INGEST_ALLOW_RUN" "1"
ensure_env_line "MEE_POST_INGEST_ALLOW_INTERNAL_WRITES" "0"
ensure_env_line "MEE_POST_INGEST_ALLOW_DERIVED_REFRESH" "1"
ensure_env_line "MEE_POST_INGEST_ENABLE_LEGACY_LIFECYCLE_PLAN" "0"

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --dry-run
node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --dry-run --execute-readbacks

sudo cp "deploy/systemd/${SERVICE_NAME}.candidate" "/etc/systemd/system/${SERVICE_NAME}"
sudo cp "deploy/systemd/${TIMER_NAME}.candidate" "/etc/systemd/system/${TIMER_NAME}"
sudo systemctl daemon-reload
sudo systemctl enable --now "${TIMER_NAME}"

systemctl list-timers "${TIMER_NAME}" --no-pager
systemctl status "${TIMER_NAME}" --no-pager
